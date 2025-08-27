import redisClient from "@repo/redis-client";
import { PrismaClient } from "../../../generated/prisma";
import { BATCH_UPLOADER_STREAM, CONSUMER_GROUP } from "./config";
import type { PriceData } from "./types";

const prisma = new PrismaClient();

export async function processBatch(streamData: any[]) {
  const trades: PriceData[] = [];
  const messageIds: string[] = [];

  // Parse each message from the stream
  for (const [messageId, fields] of streamData) {
    try {
      // Redis stream format: [messageId, ["data", "JSON_STRING"]]
      const dataIndex = fields.indexOf("data");
      if (dataIndex !== -1 && fields[dataIndex + 1]) {
        const tradeData = JSON.parse(fields[dataIndex + 1]);
        trades.push({
          price: tradeData.price,
          timestamp: tradeData.timestamp,
          symbol: tradeData.symbol,
        });
        messageIds.push(messageId);
      }
    } catch (error) {
      console.error(`Error parsing message ${messageId}:`, error);
    }
  }

  console.log(`Parsed ${trades.length} valid trades`);
  console.log("Sample trades:", trades.slice(0, 3)); // Show first 3 trades
  
  // Insert trades to TimescaleDB via Prisma
  if (trades.length > 0) {
    try {
      const insertData = trades.map(trade => ({
        time: new Date(trade.timestamp), // Convert Unix timestamp to Date
        symbol: trade.symbol,
        price: parseFloat(trade.price), // Convert string to number for Decimal
        // OHLC fields remain null initially, will be calculated by materialized views
        high: null,
        low: null,
        open: null,
        close: null
      }));

      await prisma.trade.createMany({
        data: insertData,
        skipDuplicates: true // Skip if duplicate composite key [id, time]
      });

      console.log(`✅ Successfully inserted ${trades.length} trades to database`);
    } catch (error) {
      console.error("❌ Error inserting trades to database:", error);
      // Don't acknowledge messages if database insertion failed
      return;
    }
  }
  
  // Acknowledge processed messages
  if (messageIds.length > 0) {
    try {
      await redisClient.xack(BATCH_UPLOADER_STREAM, CONSUMER_GROUP, ...messageIds);
      console.log(`Acknowledged ${messageIds.length} messages`);
    } catch (error) {
      console.error("Error acknowledging messages:", error);
    }
  }
}