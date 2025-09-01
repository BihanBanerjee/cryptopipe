import type { Request, Response } from "express";
import prisma from "@repo/prisma-client";

interface CandleData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const getCandles = async (req: Request, res: Response) => {
  try {
    const { asset, duration } = req.query;
    
    // Validate required parameters
    if (!asset || !duration) {
      return res.status(400).json({ 
        error: "Missing required parameters: asset, duration" 
      });
    }

    // Map duration to TimescaleDB materialized view
    const viewMap: Record<string, string> = {
      '1m': 'trades_1m',
      '2m': 'trades_2m',
      '5m': 'trades_5m', 
      '10m': 'trades_10m',
      '1d': 'trades_1d'
    };

    const tableName = viewMap[duration as string];
    if (!tableName) {
      return res.status(400).json({ 
        error: "Invalid duration. Supported: 1m, 2m, 5m, 10m, 1d" 
      });
    }

    // Convert asset to symbol format (e.g., "BTC" -> "BTCUSDT")
    const symbol = (asset as string).toUpperCase();
    const fullSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

    // Fixed limit for optimal performance and chart rendering
    const candleLimit = 1000;

    // Query the materialized view for the most recent candles
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
      ORDER BY bucket DESC
      LIMIT $2
    `;

    const candles = await prisma.$queryRawUnsafe(
      query,
      fullSymbol,
      candleLimit
    ) as CandleData[];

    // Debug: Check what we're getting from the database
    if (candles.length > 0) {
      console.log('🗄️ Sample database timestamp:', {
        rawTime: candles[0]!.time,
        asString: candles[0]!.time.toString(),
        getTime: candles[0]!.time.getTime(),
        toISOString: candles[0]!.time.toISOString(),
        getTimezoneOffset: candles[0]!.time.getTimezoneOffset(),
      });
    }

    // Reverse to get chronological order (oldest first)
    const chronologicalCandles = candles.reverse();

    // Format for lightweight-charts (convert timestamps to UTC seconds)
    const formattedCandles = chronologicalCandles.map(candle => ({
      time: Math.floor(new Date(candle.time).getTime() / 1000), // Ensure UTC timestamp in seconds
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low), 
      close: Number(candle.close),
      volume: Number(candle.volume)
    }));

    // Calculate time range from actual data
    const startTime = chronologicalCandles.length > 0 ? chronologicalCandles[0]!.time : new Date();
    const endTime = chronologicalCandles.length > 0 ? chronologicalCandles[chronologicalCandles.length - 1]!.time : new Date();

    res.json({
      asset: fullSymbol,
      duration,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      candles: formattedCandles,
      count: formattedCandles.length
    });
    
  } catch (error: any) {
    console.error("Error fetching candles:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};