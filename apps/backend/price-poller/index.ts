import redisClient from "@repo/redis-client";
import WebSocket from "ws";
import { BATCH_UPLOADER_STREAM } from "./config";

const SUPPORTED_PAIRS = ["btcusdt", "solusdt", "ethusdt"];

async function main() {
  const ws = new WebSocket("wss://stream.binance.com:9443/ws"); // creating a web socket client connection to binance streams.

  ws.onopen = () => { // onopen is an event handler (not a method) that gets triggered when the WebSocket connection is successfully established with the Binance server.
    console.log("connected to binance");
    const subscribeMessage = {
      method: "SUBSCRIBE",
      params: SUPPORTED_PAIRS.map((p) => `${p}@trade`),
      id: 1,
    };
    // console.log("Subscribing to:", subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage)); // stringifying the subscribeMessage object because WebSocket can only send text or binary data, not JavaScript objects.
  };

  ws.onmessage = async ({ data }) => {
    try {
      const payload = JSON.parse(data.toString());
      // console.log("Raw payload:", payload);

      if (!payload.p || !payload.T || !payload.s || !payload.q) {
        // console.log("Skipping payload - missing price/timestamp/symbol/quantity");
        return;
      }

      const originalPrice = parseFloat(payload.p);
      const quantity = parseFloat(payload.q);

      //Create spread for house edge(0.1%)
      const SPREAD_PERCENTAGE = 0.001;

      const manipulatedPrice = {
        bid: originalPrice * (1 - SPREAD_PERCENTAGE), // Lower for user sells
        ask: originalPrice * (1 + SPREAD_PERCENTAGE), // Higher for user buys
      }

      // Honest price data for database storage (candlestick charts)
      let honestPriceData = {
        price: originalPrice,
        quantity: quantity,
        timestamp: payload.T,
        symbol: payload.s,
      };

      // Manipulated price data for live trading
      // Note: Keeping decimal prices here for direct use by order controller
      // The order controller will convert these to integers for precise calculations
      let manipulatedPriceData = {
        symbol: payload.s,
        originalPrice,
        bidPrice: manipulatedPrice.bid,
        askPrice: manipulatedPrice.ask,
        timestamp: payload.T,
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