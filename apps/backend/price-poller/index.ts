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

      let priceData = {
        price: payload.p,
        timestamp: payload.T,
        symbol: payload.s,
      };

      // console.log("Processing price data:", priceData);

      await redisClient.publish(
        `market:${payload.s}`,
        JSON.stringify(priceData)
      );
      // console.log(`Published to Redis channel: market:${payload.s}`);

      await redisClient.xadd(
        BATCH_UPLOADER_STREAM,
        "*",
        "data",
        JSON.stringify(priceData)
      );
      // console.log(`Added to Redis stream: ${BATCH_UPLOADER_STREAM}`);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = () => {
    console.log("client closed");
  };
}

main();