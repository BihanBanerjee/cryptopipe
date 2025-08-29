import redisClient from "@repo/redis-client";
import WebSocket from "ws";
import { BATCH_UPLOADER_STREAM } from "./config";

const SUPPORTED_PAIRS = ["btcusdt", "solusdt", "ethusdt"];

async function main() {
  const ws = new WebSocket("wss://stream.binance.com:9443/ws");

  ws.onopen = () => {
    console.log("connected to binance");
    const subscribeMessage = {
      method: "SUBSCRIBE",
      params: SUPPORTED_PAIRS.map((p) => `${p}@trade`),
      id: 1,
    };
    // console.log("Subscribing to:", subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage));
  };

  ws.onmessage = async ({ data }) => {
    try {
      const payload = JSON.parse(data.toString());
      // console.log("Raw payload:", payload);

      if (!payload.p || !payload.T || !payload.s) {
        // console.log("Skipping payload - missing price/timestamp/symbol");
        return;
      }

      const originalPrice = parseFloat(payload.p);

      //Create spread for house edge(0.1%)
      const SPREAD_PERCENTAGE = 0.001;

      const manipulatedPrice = {
        bid: originalPrice * (1 - SPREAD_PERCENTAGE), // Lower for user sells
        ask: originalPrice * (1 + SPREAD_PERCENTAGE), // Higher for user buys
      }

      // Honest price data for database storage (candlestick charts)
      let honestPriceData = {
        price: originalPrice,
        timestamp: payload.T,
        symbol: payload.s,
      };

      // Manipulated price data for live trading
      let manipulatedPriceData = {
        symbol: payload.s,
        originalPrice,
        bidPrice: manipulatedPrice.bid,
        askPrice: manipulatedPrice.ask,
        timestamp: payload.T,  // ← Timestamp is here
      };

      // Publish MANIPULATED prices for trading
      await redisClient.publish(
        `market:${payload.s}`,
        JSON.stringify(manipulatedPriceData)  // ← This contains timestamp
      );
      console.log(`Published to Redis channel: market:${payload.s}`);


      // Stream HONEST prices for database storage (candlestick charts)
      await redisClient.xadd(
        BATCH_UPLOADER_STREAM,
        "*",
        "data",
        JSON.stringify(honestPriceData)
      );
      // console.log(`Added honest prices to Redis stream: ${BATCH_UPLOADER_STREAM}`);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = () => {
    console.log("client closed");
  };
}

main();