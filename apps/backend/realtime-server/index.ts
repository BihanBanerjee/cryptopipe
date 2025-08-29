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
    // Only connect if not already connected
    if (subscriber.status !== 'ready' && subscriber.status !== 'connecting' && subscriber.status !== 'connect') {
      await subscriber.connect();
    }

    // Set up pattern message listener before subscribing
    subscriber.on('pmessage', (pattern: string, channel: string, message: string | Buffer) => {
        // Convert message to string if it's a Buffer
        const messageStr = message instanceof Buffer ? message.toString() : String(message);
        const channelStr = String(channel);
        
        // Type guards to ensure we have valid data
        if (!messageStr || !channelStr) {
            console.log('Received empty message or channel');
            return;
        }
        
        console.log(`📈 Price update from ${channelStr}`);

        // Extract symbol from channel (market:BTCUSDT -> BTCUSDT)
        const symbol = channelStr.split(':')[1];
        if (!symbol) {
            console.log('Could not extract symbol from channel:', channelStr);
            return;
        }

        // Broadcast to ALL connected frontend clients
        broadcastToAllClients(symbol, messageStr);
    });

    // Subscribe to all market channels from price-poller
    // This listens to: market:BTCUSDT, market:ETHUSDT, market:SOLUSDT
    await subscriber.psubscribe('market:*');

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

  // Handle graceful shutdown (only register once)
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\n🛑 Shutting down realtime server...');
    wss.close(() => {
      console.log('✅ WebSocket server closed');
      subscriber.quit();
      process.exit(0);
    });
  });

  main().catch(console.error);