"use client";

import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, Time, CandlestickSeries, ISeriesApi } from 'lightweight-charts';
import { TimeFrame } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';


interface TradingChartProps {
  symbol?: string;
  timeFrame?: TimeFrame;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function TradingChart({ 
  symbol = 'BTC', 
  timeFrame = '5m'
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  // Move WebSocket connection directly to this component
  const { priceData } = useWebSocket();

  // Simple data fetch
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        asset: symbol,
        duration: timeFrame
      });

      const response = await fetch(`http://localhost:3002/candles?${params}`);
      const data = await response.json();
      
      // Debug: Check what timestamps we're receiving from API
      if (data.candles && data.candles.length > 0) {
        const sampleCandle = data.candles[0];
        console.log('📊 Sample API timestamp:', {
          rawTime: sampleCandle.time,
          asDate: new Date(sampleCandle.time * 1000),
          asLocalString: new Date(sampleCandle.time * 1000).toString(),
          asISOString: new Date(sampleCandle.time * 1000).toISOString(),
          currentTime: new Date().toString(),
          currentUTC: new Date().toISOString(),
        });
      }
      
      if (data.candles && candlestickSeriesRef.current) {
        const formattedCandles = data.candles.map((candle: CandleData) => {
          // Convert UTC timestamp to local timezone using official approach
          // The API returns UTC timestamps, we need to convert to local time
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const zonedDate = new Date(new Date(candle.time * 1000).toLocaleString('en-US', { timeZone }));
          const localTimestamp = zonedDate.getTime() / 1000;
          
          return {
            time: localTimestamp as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };
        });
        
        candlestickSeriesRef.current.setData(formattedCandles);
        chartRef.current?.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [symbol, timeFrame]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        // Use tickMarkFormatter for proper timezone display
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Load data
    fetchData();

    // Handle resize with ResizeObserver for better performance
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        const { clientWidth, clientHeight } = chartContainerRef.current;
        chart.applyOptions({
          width: clientWidth,
          height: clientHeight,
        });
        chart.timeScale().fitContent();
      }
    };

    // Use ResizeObserver to detect container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(chartContainerRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Initial size
    setTimeout(handleResize, 100); // Small delay to ensure DOM is ready

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      chart.remove();
    };
  }, [fetchData]);

  // Load data when symbol/timeframe changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates - Update the last candle with live price
  useEffect(() => {
    const fullSymbol = `${symbol.toUpperCase()}USDT`;
    const currentPrice = priceData[fullSymbol];
    
    console.log(`🔴 CHART: Checking real-time update for ${fullSymbol}:`, {
      currentPrice,
      hasSeriesRef: !!candlestickSeriesRef.current,
      symbol,
      timeFrame,
      priceValue: currentPrice?.originalPrice
    });
    
    if (currentPrice?.originalPrice && candlestickSeriesRef.current) {
      const price = currentPrice.originalPrice;
      
      console.log(`🟢 CHART: Updating last candle for ${fullSymbol} with live price: ${price}`);
      
      try {
        // Get current data from the series to find the last candle
        const seriesData = (candlestickSeriesRef.current as unknown as { data: () => CandleData[] }).data();
        
        if (seriesData && seriesData.length > 0) {
          // Get the last candle time
          const lastCandle = seriesData[seriesData.length - 1];
          const lastCandleTime = lastCandle.time;
          
          console.log('🕐 Real-time update - Last candle time:', lastCandleTime, 'Current price timestamp:', currentPrice.timestamp);
          
          // Update the last candle with current price as close
          // Also update high/low if the new price exceeds them
          const updatedCandle = {
            time: lastCandleTime as Time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high || price, price),
            low: Math.min(lastCandle.low || price, price),
            close: price,
          };
          
          candlestickSeriesRef.current.update(updatedCandle);
          console.log(`✅ CHART: Successfully updated last candle for ${fullSymbol}`, updatedCandle);
        } else {
          console.log(`🟡 CHART: No existing candle data to update for ${fullSymbol}`);
        }
      } catch (error) {
        console.error('🚨 CHART: Failed to update last candle:', error);
      }
    }
  }, [priceData, symbol, timeFrame]);


  return (
    <div className="h-full w-full">
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}