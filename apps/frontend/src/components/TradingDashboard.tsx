"use client";

import { useState } from 'react';
import InstrumentPanel from './InstrumentPanel';
import TradingChart from './TradingChart';
import { TimeFrame } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

export default function TradingDashboard() {
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('5m');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  
  // Only get WebSocket data for the price header
  const { priceData } = useWebSocket();
  return (
    <div className="h-screen bg-gray-900 text-white flex overflow-hidden">
      {/* Left Panel - Instruments */}
      <div className="bg-gray-800 border-r border-gray-700 relative flex-shrink-0" style={{ minWidth: '280px', width: '320px', maxWidth: '600px' }} id="instruments-container">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚡</span>
            </div>
            {/* Platform Name */}
            <div>
              <h2 className="text-lg font-bold text-white">TradeBeast</h2>
            </div>
          </div>
        </div>
        <InstrumentPanel />
      </div>

      {/* Center Panel - Chart + Positions */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chart Header */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4">
          {/* Asset Tabs */}
          <div className="flex items-center space-x-1 mr-6">
            {(['BTC', 'SOL', 'ETH'] as const).map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedSymbol(asset)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  selectedSymbol === asset 
                    ? 'bg-blue-600 text-white border border-blue-500' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-transparent'
                }`}
              >
                {asset}/USDT
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-yellow-400 font-semibold">{selectedSymbol}/USDT</span>
            {(() => {
              const fullSymbol = `${selectedSymbol.toUpperCase()}USDT`;
              const currentPrice = priceData[fullSymbol];
              const price = currentPrice?.originalPrice || currentPrice?.askPrice || 0;
              const isUp = currentPrice?.isUp ?? true;
              
              return (
                <>
                  <span className={`font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    ${price > 0 ? price.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: selectedSymbol === 'BTC' ? 2 : 3 
                    }) : '---'}
                  </span>
                  <span className={`text-sm ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}0.5%
                  </span>
                </>
              );
            })()}
          </div>
          
          {/* Timeframe buttons */}
          <div className="ml-auto flex space-x-2">
            {(['1m', '2m', '5m', '10m', '1d'] as TimeFrame[]).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeFrame(timeframe)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedTimeFrame === timeframe 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 bg-gray-900 relative min-w-0 overflow-hidden">
          {/* Order Panel Toggle Button */}
          {!isOrderPanelOpen && (
            <button
              onClick={() => setIsOrderPanelOpen(true)}
              className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-lg transition-colors"
              title="Open Order Panel"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          <TradingChart 
            symbol={selectedSymbol}
            timeFrame={selectedTimeFrame}
            onTimeFrameChange={setSelectedTimeFrame}
          />
        </div>
        
        {/* Positions Panel */}
        <div className="h-48 bg-gray-800 border-t border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex space-x-6">
              <button className="text-white border-b-2 border-blue-500 pb-1 text-sm">Open</button>
              <button className="text-gray-400 hover:text-white pb-1 text-sm">Pending</button>
              <button className="text-gray-400 hover:text-white pb-1 text-sm">Closed</button>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <div>No open positions</div>
              <div className="text-xs mt-1">PositionsPanel placeholder</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Order Panel */}
      {isOrderPanelOpen && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 animate-slide-in-right flex-shrink-0">
          {/* Order Panel Header with Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Order Panel</h3>
            <button
              onClick={() => setIsOrderPanelOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
              title="Close Order Panel"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Order Panel Content */}
          <div className="p-4">
            <div className="text-center text-gray-400">
              <div className="text-2xl mb-2">🛒</div>
              <div>Buy/Sell Form</div>
              <div className="text-xs mt-1">Trading form will be here</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}