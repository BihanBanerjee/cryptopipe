  import { WebSocketServer, WebSocket } from 'ws';
  import redisClient from '@repo/redis-client';

  const PORT = 3001;

  // WebSocket server setup
  const wss = new WebSocketServer({ port: PORT });

  // Track all connected clients
  const clients = new Set<WebSocket>();

  // Redis subscriber client (separate from main redis client)
  const subscriber = redisClient.duplicate();

  async function initializeRedisSubscription() {
    await subscriber.connect();

    // Subscribe to all market channels from price-poller
    // This listens to: market:BTCUSDT, market:ETHUSDT, market:SOLUSDT
    await subscriber.psubscribe('market:*', (message, channel) => {
        // Type guards to ensure we have valid data
        // Type guards to ensure we have valid string data
        if (!message || !channel || typeof message !== 'string' || typeof channel !== 'string') {
            console.log('Received invalid message or channel');
            return;
        }
        
        console.log(`📈 Price update from ${channel}`);

        // Extract symbol from channel (market:BTCUSDT -> BTCUSDT)
        const symbol = channel.split(':')[1];
        if (!symbol) {
            console.log('Could not extract symbol from channel:', channel);
            return;
        }

        // Broadcast to ALL connected frontend clients
        broadcastToAllClients(symbol, message);
    });

        console.log('✅ Subscribed to Redis market channels (market:*)');
    }

  function broadcastToAllClients(symbol: string, data: string) {
    const message = JSON.stringify({
      type: 'price_update',
      symbol,
      data: JSON.parse(data)
    });

    console.log(`📡 Broadcasting ${symbol} update to ${clients.size} clients`);

    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('🔌 New frontend client connected');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to realtime crypto data',
      assets: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
    }));

    // Handle client disconnect
    ws.on('close', () => {
      console.log('🔌 Frontend client disconnected');
      clients.delete(ws);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  async function main() {
    try {
      await initializeRedisSubscription();
      console.log(`🚀 Realtime server running on ws://localhost:${PORT}`);
      console.log(`📊 Broadcasting live data for: BTCUSDT, ETHUSDT, SOLUSDT`);
      console.log(`🔗 Frontend can connect to: ws://localhost:${PORT}`);
    } catch (error) {
      console.error('Failed to start realtime server:', error);
      process.exit(1);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down realtime server...');
    wss.close(() => {
      console.log('✅ WebSocket server closed');
      subscriber.quit();
      process.exit(0);
    });
  });

  main().catch(console.error);