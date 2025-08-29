import express from "express"
import { PrismaClient } from "../../../generated/prisma";


const PORT = 3002; 
const prisma = new PrismaClient();

const app = express();
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


app.post("/signin" , (req, res) => {
  // TODO: Implement authentication
  res.json({ message: "Sign in endpoint" });
});

app.post("/signup" , (req, res) => {
  // TODO: Implement authentication  
  res.json({ message: "Sign up endpoint" });
});

// GET /candles?asset=BTCUSDT&duration=5m&startTime=2024-01-01T10:00:00Z&endTime=2024-01-01T11:00:00Z
app.get("/candles", async (req, res) => {
  try {
    const { asset, duration, startTime, endTime } = req.query;
    
    // Validate required parameters
    if (!asset || !duration || !startTime || !endTime) {
      return res.status(400).json({ 
        error: "Missing required parameters: asset, duration, startTime, endTime" 
      });
    }

    // Map duration to TimescaleDB materialized view
    const viewMap: Record<string, string> = {
      '30s': 'trades_30s',
      '1m': 'trades_1m',
      '5m': 'trades_5m', 
      '15m': 'trades_15m',
      '1h': 'trades_1h',
      '4h': 'trades_4h',
      '1d': 'trades_1d'
    };

    const tableName = viewMap[duration as string];
    if (!tableName) {
      return res.status(400).json({ 
        error: "Invalid duration. Supported: 30s, 1m, 5m, 15m, 1h, 4h, 1d" 
      });
    }

    // Convert asset to symbol format (e.g., "BTC" -> "BTCUSDT")
    const symbol = (asset as string).toUpperCase();
    const fullSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

    // Query the materialized view using raw SQL with dynamic table name
    const query = `
      SELECT 
        bucket as time,
        open,
        high, 
        low,
        close,
        volume
      FROM ${tableName}
      WHERE symbol = $1
      AND bucket >= $2
      AND bucket <= $3
      ORDER BY bucket ASC
      LIMIT 1000
    `;

    const candles = await prisma.$queryRawUnsafe(
      query,
      fullSymbol,
      new Date(startTime as string),
      new Date(endTime as string)
    ) as Array<{
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;

    // Format for lightweight-charts (convert timestamps to seconds)
    const formattedCandles = candles.map(candle => ({
      time: Math.floor(candle.time.getTime() / 1000), // Convert to Unix timestamp in seconds
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low), 
      close: Number(candle.close),
      volume: Number(candle.volume)
    }));

    res.json({
      asset: fullSymbol,
      duration,
      startTime: new Date(startTime as string).toISOString(),
      endTime: new Date(endTime as string).toISOString(),
      candles: formattedCandles
    });
    
  } catch (error: any) {
    console.error("Error fetching candles:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});





app.listen(3002 , () => {
    console.log('listening on port 3002');
})