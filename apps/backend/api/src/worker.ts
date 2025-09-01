import redisClient from "@repo/redis-client";
import prisma from "@repo/prisma-client";
import type { Order } from "../../../../generated/prisma";
import {
  toInteger,
  toDecimal,
  calculateLongPnL,
  calculateShortPnL,
  add,
  subtract,
  formatPrice
} from "./utils/price";

// Liquidation reasons for audit trail
type LiquidationReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'MARGIN_CALL' | 'MANUAL';

/**
 * Fetch all open orders with user and balance information
 */
async function fetchOpenOrders() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "OPEN" },
      include: {
        user: {
          include: {
            balance: true,
          },
        },
      },
    });
    
    if (orders.length === 0) {
      console.log("=� No open orders to monitor");
    } else {
      console.log(`=� Monitoring ${orders.length} open orders`);
    }
    
    return orders;
  } catch (error) {
    console.error("L Error fetching open orders:", error);
    return [];
  }
}

/**
 * Check if position should be closed due to stop loss
 */
function shouldTriggerStopLoss(PnLInt: bigint, stopLossInt: bigint): boolean {
  if (stopLossInt === 0n) return false; // No stop loss set
  
  // Stop loss triggers when losses exceed the stop loss threshold
  return PnLInt < 0n && (PnLInt * -1n) >= stopLossInt;
}

/**
 * Check if position should be closed due to take profit
 */
function shouldTriggerTakeProfit(PnLInt: bigint, takeProfitInt: bigint): boolean {
  if (takeProfitInt === 0n) return false; // No take profit set
  
  // Take profit triggers when profits reach the take profit threshold
  return PnLInt > 0n && PnLInt >= takeProfitInt;
}

/**
 * Check if position should be liquidated due to margin call
 * Liquidate when losses exceed 90% of margin to prevent negative balance
 */
function shouldLiquidate(PnLInt: bigint, marginInt: bigint): boolean {
  const liquidationThreshold = (marginInt * 90n) / 100n; // 90% of margin
  return PnLInt < 0n && (PnLInt * -1n) >= liquidationThreshold;
}

/**
 * Close an order and update user balance atomically
 */
async function closeOrder(
  order: any,
  PnLInt: bigint,
  currentPriceInt: bigint,
  reason: LiquidationReason
) {
  try {
    console.log(`= Closing order ${order.orderId} - Reason: ${reason}, P&L: ${formatPrice(PnLInt)}`);
    
    const result = await prisma.$transaction(async (tx) => {
      // Update order status and final P&L
      const updatedOrder = await tx.order.update({
        where: {
          orderId: order.orderId,
        },
        data: {
          status: "CLOSED",
          finalPnLInt: PnLInt,
        },
      });

      // Calculate new balance: current balance + returned margin + P&L
      const currentBalanceInt = order.user.balance.balanceInt;
      const newBalanceInt = add(add(currentBalanceInt, order.marginInt), PnLInt);

      // Update user balance
      const updatedBalance = await tx.balance.update({
        where: {
          userId: order.userId,
        },
        data: {
          balanceInt: newBalanceInt,
        },
      });

      return { updatedOrder, updatedBalance };
    });

    console.log(` Order ${order.orderId} closed successfully`);
    console.log(`=� Balance updated: ${formatPrice(result.updatedBalance.balanceInt)}`);
    
    return result;
  } catch (error) {
    console.error(`L Error closing order ${order.orderId}:`, error);
    throw error;
  }
}

/**
 * Process a single order for potential liquidation
 */
async function processOrder(order: any, currentPriceInt: bigint) {
  const { buyPriceInt, qtyInt, marginInt, stopLossInt, takeProfitInt, orderType, asset } = order;

  try {
    // Calculate P&L using integer arithmetic
    const PnLInt = orderType === "LONG"
      ? calculateLongPnL(currentPriceInt, buyPriceInt, qtyInt)
      : calculateShortPnL(buyPriceInt, currentPriceInt, qtyInt);

    // Check liquidation conditions in priority order
    if (shouldLiquidate(PnLInt, marginInt)) {
      await closeOrder(order, PnLInt, currentPriceInt, 'MARGIN_CALL');
      return true;
    }

    if (shouldTriggerStopLoss(PnLInt, stopLossInt)) {
      await closeOrder(order, PnLInt, currentPriceInt, 'STOP_LOSS');
      return true;
    }

    if (shouldTriggerTakeProfit(PnLInt, takeProfitInt)) {
      await closeOrder(order, PnLInt, currentPriceInt, 'TAKE_PROFIT');
      return true;
    }

    // Log current P&L for monitoring (optional)
    const currentPnL = formatPrice(PnLInt);
    console.log(`=� ${asset} Order ${order.orderId}: P&L = ${currentPnL}`);
    
    return false;
  } catch (error) {
    console.error(`L Error processing order ${order.orderId}:`, error);
    return false;
  }
}

/**
 * Main liquidation monitoring loop
 */
async function startLiquidationEngine() {
  console.log("=� Starting Liquidation Engine...");

  try {
    // Subscribe to market data channels
    const channels = ["market:BTCUSDT", "market:SOLUSDT", "market:ETHUSDT"];
    await redisClient.subscribe(...channels);
    console.log("=� Subscribed to market channels:", channels.join(", "));
  } catch (error) {
    console.error("L Redis subscription error:", error);
    process.exit(1);
  }

  // Handle incoming market data
  redisClient.on("message", async (channel, message) => {
    try {
      const parsedData = JSON.parse(message);
      const { symbol, bidPrice, askPrice } = parsedData;

      if (!symbol || (!bidPrice && !askPrice)) {
        console.warn("� Invalid market data received:", parsedData);
        return;
      }

      // Get all open orders
      const openOrders = await fetchOpenOrders();
      
      // Filter orders for this specific asset
      const relevantOrders = openOrders.filter(order => order.asset === symbol);

      if (relevantOrders.length === 0) {
        return; // No orders for this asset
      }

      console.log(`=� Processing ${relevantOrders.length} orders for ${symbol}`);

      // Process each relevant order
      for (const order of relevantOrders) {
        try {
          // Use bid price for LONG positions (selling), ask price for PUT positions (buying back)
          const currentPrice = order.orderType === "LONG" ? bidPrice : askPrice;
          const currentPriceInt = toInteger(currentPrice);

          await processOrder(order, currentPriceInt);
        } catch (error) {
          console.error(`L Error processing order ${order.orderId}:`, error);
          // Continue with next order even if one fails
        }
      }
    } catch (error) {
      console.error("L Error processing market message:", error);
    }
  });

  // Handle Redis connection events
  redisClient.on("error", (error) => {
    console.error("L Redis error:", error);
  });

  redisClient.on("connect", () => {
    console.log(" Connected to Redis");
  });

  redisClient.on("disconnect", () => {
    console.warn("� Disconnected from Redis");
  });
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log("\n=� Shutting down liquidation engine...");
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\n=� Terminating liquidation engine...");
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the liquidation engine
startLiquidationEngine().catch((error) => {
  console.error("L Fatal error starting liquidation engine:", error);
  process.exit(1);
});