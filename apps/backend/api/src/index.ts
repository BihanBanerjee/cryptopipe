import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; 
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { candleRouter } from "./routes/candles";
import { orderRouter } from "./routes/order";

const app = express();
const port = process.env.API_PORT || 3002;
dotenv.config();
app.use(cors({ credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/candles", candleRouter);
app.use("/api/v1/user", authRouter);
app.use("/api/v1/order", orderRouter);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});






















// import express from "express"
// import cors from "cors"
// import cookieparser from "cookie-parser"
// import dotenv from "dotenv"
// import prisma from "@repo/prisma-client";


// const PORT = process.env.API_PORT || 3002;

// const app = express();
// app.use(express.json());

// // Add CORS middleware
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
//   if (req.method === 'OPTIONS') {
//     res.sendStatus(200);
//   } else {
//     next();
//   }
// });


// app.post("/signin" , (req, res) => {
//   // TODO: Implement authentication
//   res.json({ message: "Sign in endpoint" });
// });


// // GET /candles?asset=BTCUSDT&duration=5m&limit=1000
// app.get("/candles", async (req, res) => {
//   try {
//     const { asset, duration, limit = '1000' } = req.query;
    
//     // Validate required parameters
//     if (!asset || !duration) {
//       return res.status(400).json({ 
//         error: "Missing required parameters: asset, duration" 
//       });
//     }

//     // Map duration to TimescaleDB materialized view
//     const viewMap: Record<string, string> = {
//       '1m': 'trades_1m',
//       '2m': 'trades_2m',
//       '5m': 'trades_5m', 
//       '10m': 'trades_10m',
//       '1d': 'trades_1d'
//     };

//     const tableName = viewMap[duration as string];
//     if (!tableName) {
//       return res.status(400).json({ 
//         error: "Invalid duration. Supported: 1m, 2m, 5m, 10m, 1d" 
//       });
//     }

//     // Convert asset to symbol format (e.g., "BTC" -> "BTCUSDT")
//     const symbol = (asset as string).toUpperCase();
//     const fullSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

//     // Parse limit parameter
//     const candleLimit = Math.min(parseInt(limit as string) || 1000, 10000); // Max 10k candles

//     // Query the materialized view for the most recent candles
//     const query = `
//       SELECT 
//         bucket as time,
//         open,
//         high, 
//         low,
//         close,
//         volume
//       FROM ${tableName}
//       WHERE symbol = $1
//       ORDER BY bucket DESC
//       LIMIT $2
//     `;

//     const candles = await prisma.$queryRawUnsafe(
//       query,
//       fullSymbol,
//       candleLimit
//     ) as Array<{
//       time: Date;
//       open: number;
//       high: number;
//       low: number;
//       close: number;
//       volume: number;
//     }>;

//     // Debug: Check what we're getting from the database
//     if (candles.length > 0) {
//       console.log('🗄️ Sample database timestamp:', {
//         rawTime: candles[0]!.time,
//         asString: candles[0]!.time.toString(),
//         getTime: candles[0]!.time.getTime(),
//         toISOString: candles[0]!.time.toISOString(),
//         getTimezoneOffset: candles[0]!.time.getTimezoneOffset(),
//       });
//     }

//     // Reverse to get chronological order (oldest first)
//     const chronologicalCandles = candles.reverse();

//     // Format for lightweight-charts (convert timestamps to UTC seconds)
//     const formattedCandles = chronologicalCandles.map(candle => ({
//       time: Math.floor(new Date(candle.time).getTime() / 1000), // Ensure UTC timestamp in seconds
//       open: Number(candle.open),
//       high: Number(candle.high),
//       low: Number(candle.low), 
//       close: Number(candle.close),
//       volume: Number(candle.volume)
//     }));

//     // Calculate time range from actual data
//     const startTime = chronologicalCandles.length > 0 ? chronologicalCandles[0]!.time : new Date();
//     const endTime = chronologicalCandles.length > 0 ? chronologicalCandles[chronologicalCandles.length - 1]!.time : new Date();

//     res.json({
//       asset: fullSymbol,
//       duration,
//       startTime: startTime.toISOString(),
//       endTime: endTime.toISOString(),
//       candles: formattedCandles,
//       count: formattedCandles.length
//     });
    
//   } catch (error: any) {
//     console.error("Error fetching candles:", error);
//     res.status(500).json({ error: "Internal server error", details: error.message });
//   }
// });

// app.post("/api/v1/user/signup" , async (req, res) => {
// });

// app.post("/api/v1/user/signup", async() => {

// })




// app.listen(PORT , () => {
//     console.log(`listening on port ${PORT}`);
// })