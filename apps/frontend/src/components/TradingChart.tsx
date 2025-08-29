"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { CandleData, CandleResponse, TimeFrame } from '../types';

interface TradingChartProps {
  symbol?: string;
  timeFrame?: TimeFrame;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
}

export default function TradingChart({ 
  symbol = 'BTC', 
  timeFrame = '5m',
  onTimeFrameChange 
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  // Fetch candle data from backend
  const fetchCandleData = async (asset: string, duration: TimeFrame) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get data for last 24 hours by default
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        asset,
        duration,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      const response = await fetch(`http://localhost:3002/candles?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data: CandleResponse = await response.json();
      console.log('Fetched candle data:', data);
      return data.candles;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch candle data';
      setError(errorMessage);
      console.error('Error fetching candle data:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || typeof window === 'undefined') return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    // Create volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6b7280',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    // Position volume series at bottom
    try {
      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
    } catch (e) {
      console.warn('Could not configure volume scale:', e);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle chart resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Load data when symbol or timeframe changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadData = async () => {
      const candles = await fetchCandleData(symbol, timeFrame);
      
      if (candlestickSeriesRef.current && volumeSeriesRef.current) {
        if (candles.length > 0) {
          // Set candlestick data
          candlestickSeriesRef.current.setData(candles);
          
          // Set volume data
          const volumeData = candles.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? '#10b98180' : '#ef444480'
          }));
          volumeSeriesRef.current.setData(volumeData);

          // Fit content to chart
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
          setHasData(true);
        } else {
          // Clear the chart when no data
          candlestickSeriesRef.current.setData([]);
          volumeSeriesRef.current.setData([]);
          setHasData(false);
          console.log('No candle data available for', symbol, timeFrame);
        }
      }
    };

    loadData();
  }, [symbol, timeFrame]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-2">�</div>
          <div className="text-lg mb-2">Error loading chart</div>
          <div className="text-sm opacity-80">{error}</div>
          <button 
            onClick={() => fetchCandleData(symbol, timeFrame)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm">Loading chart data...</div>
          </div>
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <div className="text-center text-yellow-400">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-lg mb-2">No Data Available</div>
            <div className="text-sm opacity-80">No {timeFrame} candle data found for {symbol}</div>
            <div className="text-xs opacity-60 mt-2">Try a different timeframe or ensure data is being collected</div>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}