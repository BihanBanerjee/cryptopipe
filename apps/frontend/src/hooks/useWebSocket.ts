"use client";

import { useEffect, useState, useRef } from 'react';

interface PriceData {
  symbol: string;
  originalPrice: number;
  bidPrice: number;
  askPrice: number;
  timestamp: number;
  isUp?: boolean;
}

interface WebSocketMessage {
  type: 'price_update';
  symbol: string;
  data: PriceData;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const previousOriginalPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Connect to realtime-server (optional - gracefully fail if server not running)
    try {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to realtime-server');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data); // event.data is whatever payload the server sent over the websocket.
        
        if (message.type === 'price_update') {
          console.log(`🔴 WEBSOCKET: Price update for ${message.symbol}:`, message.data);
          
          // Calculate price direction based on ask price (both bid and ask move together)
          const currentOriginalPrice = message.data.originalPrice;
          const previousOriginalPrice = previousOriginalPricesRef.current[message.symbol];
          const isUp = previousOriginalPrice ? currentOriginalPrice > previousOriginalPrice : true;
          
          // Store current ask price for next comparison
          previousOriginalPricesRef.current[message.symbol] = currentOriginalPrice;
          
          // Only update if price actually changed to prevent infinite re-renders
          setPriceData(prev => {
            const currentData = prev[message.symbol];
            const newData = { ...message.data, isUp };
            
            // Compare relevant fields to avoid unnecessary updates
            if (currentData && 
                currentData.askPrice === newData.askPrice &&
                currentData.bidPrice === newData.bidPrice &&
                currentData.originalPrice === newData.originalPrice) {
              return prev; // No change, return same object to prevent re-render
            }
            
            return {
              ...prev,
              [message.symbol]: newData
            };
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

      ws.onerror = (error) => {
        console.warn('WebSocket connection failed (realtime-server may not be running):', error);
        setIsConnected(false);
      };

      // Cleanup on unmount
      return () => {
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          ws.close();
        }
      };
    } catch (error) {
      console.warn('Failed to establish WebSocket connection - realtime-server may not be running:', error);
      setIsConnected(false);
      return () => {}; // No cleanup needed
    }
  }, []);

  return {
    isConnected,
    priceData,
  };
}