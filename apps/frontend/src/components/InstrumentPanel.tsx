"use client";

import { useWebSocket } from "@/hooks/useWebSocket";

export default function InstrumentPanel() {
  const { isConnected, priceData } = useWebSocket();

  // Convert WebSocket data to display format
  const instruments = [
    {
      symbol: 'BTCUSDT',
      name: 'BTC',
      bidPrice: priceData['BTCUSDT']?.bidPrice || 67245.67,
      askPrice: priceData['BTCUSDT']?.askPrice || 67295.89,
      isUp: priceData['BTCUSDT']?.isUp ?? true,
    },
    {
      symbol: 'ETHUSDT', 
      name: 'ETH',
      bidPrice: priceData['ETHUSDT']?.bidPrice || 3125.43,
      askPrice: priceData['ETHUSDT']?.askPrice || 3135.67,
      isUp: priceData['ETHUSDT']?.isUp ?? true,
    },
    {
      symbol: 'SOLUSDT',
      name: 'SOL', 
      bidPrice: priceData['SOLUSDT']?.bidPrice || 145.23,
      askPrice: priceData['SOLUSDT']?.askPrice || 145.89,
      isUp: priceData['SOLUSDT']?.isUp ?? false,
    },
  ];

  return (
    <div className="h-full flex flex-col relative group" style={{ minWidth: '280px' }}>
      {/* Resize Handle */}
      <div 
        className="absolute top-0 right-0 w-2 h-full bg-gray-600/30 hover:bg-blue-500/70 cursor-col-resize z-20 transition-colors border-r border-gray-500"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const startX = e.clientX;
          const container = document.getElementById('instruments-container');
          
          if (!container) {
            console.error('instruments-container not found');
            return;
          }
          
          const startWidth = container.offsetWidth;
          console.log('Starting resize from width:', startWidth);
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            const deltaX = moveEvent.clientX - startX;
            
            // Calculate maximum width to ensure chart remains visible
            const viewportWidth = window.innerWidth;
            const minChartWidth = 400; // Minimum width for chart visibility
            const orderPanelWidth = 320; // Width of order panel when open
            const maxAllowedWidth = Math.min(600, viewportWidth - minChartWidth - orderPanelWidth);
            
            const newWidth = Math.max(280, Math.min(maxAllowedWidth, startWidth + deltaX));
            
            if (container) {
              container.style.width = `${newWidth}px`;
              console.log('New width:', newWidth, 'Max allowed:', maxAllowedWidth);
              
              // Trigger a resize event to update the chart
              window.dispatchEvent(new Event('resize'));
            }
          };
          
          const handleMouseUp = () => {
            console.log('Resize ended');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
          };
          
          // Prevent text selection during drag
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
        title="Drag to resize panel"
      />
      

      {/* Column Headers */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-750 mt-12">
        <div className="grid gap-0 text-xs text-gray-400 font-medium" style={{ gridTemplateColumns: '1fr 40px 100px 100px' }}>
          <span>Symbol</span>
          <span className="text-center">Signal</span>
          <span className="text-center">Bid</span>
          <span className="text-center">Ask</span>
        </div>
      </div>

      {/* Instrument list */}
      <div className="flex-1 overflow-y-auto">
        {instruments.map((instrument) => (
          <div key={instrument.symbol} className="px-4 py-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/30 transition-colors">
            <div className="grid gap-0 items-center" style={{ gridTemplateColumns: '1fr 40px 100px 100px' }}>
              {/* Symbol with icon */}
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                  instrument.symbol === 'BTCUSDT' ? 'text-orange-500 bg-orange-500/10' :
                  instrument.symbol === 'ETHUSDT' ? 'text-blue-500 bg-blue-500/10' :
                  instrument.symbol === 'SOLUSDT' ? 'text-purple-500 bg-purple-500/10' :
                  'text-gray-400 bg-gray-500/10'
                }`}>
                  {instrument.symbol === 'BTCUSDT' && '₿'}
                  {instrument.symbol === 'ETHUSDT' && 'Ξ'}
                  {instrument.symbol === 'SOLUSDT' && '◎'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{instrument.name}</div>
                  <div className="text-xs text-gray-400 truncate">{instrument.symbol}</div>
                </div>
              </div>

              {/* Signal indicator */}
              <div className="flex justify-center">
                <div className={`w-full h-6 rounded flex items-center justify-center ${
                  instrument.isUp ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={instrument.isUp 
                      ? "M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                      : "M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                    } clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Bid Price - Color based on overall price direction */}
              <div className="text-center min-w-0">
                <div className={`text-xs font-mono font-medium px-1 py-1 rounded truncate ${
                  priceData[instrument.symbol]?.isUp ?? true 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {instrument.symbol === 'BTCUSDT' 
                    ? instrument.bidPrice.toFixed(2)
                    : instrument.bidPrice.toFixed(3)
                  }
                </div>
              </div>

              {/* Ask Price - Color based on overall price direction */}  
              <div className="text-center min-w-0">
                <div className={`text-xs font-mono font-medium px-1 py-1 rounded truncate ${
                  priceData[instrument.symbol]?.isUp ?? true 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {instrument.symbol === 'BTCUSDT' 
                    ? instrument.askPrice.toFixed(2)
                    : instrument.askPrice.toFixed(3)
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom info */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        <div className="text-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          WebSocket: {isConnected ? 'connected' : 'disconnected'} 
          {!isConnected && ' (using mock data)'}
        </div>
      </div>
    </div>
  );
}