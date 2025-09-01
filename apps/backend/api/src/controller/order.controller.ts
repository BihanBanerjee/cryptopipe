import type { Response } from "express";
import type { authRequest } from "../middleware/auth";
import prisma from "@repo/prisma-client";
import type { orderStatus, position, token } from "../../../../../generated/prisma";
import redisClient from "@repo/redis-client";
import {
  toInteger,
  toDecimal,
  calculatePositionAmount,
  calculateMargin,
  calculateLongPnL,
  calculateShortPnL,
  add,
  subtract,
  isValidPrice,
  isValidQuantity,
  hasSufficientBalance,
  formatPrice
} from "../utils/price";

export const getOrder = async (req: authRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const order = await prisma.order.findUnique({
      where: {
        orderId,
        userId: req.user.id, // Ensure user can only access their own orders
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const openOrder = async (req: authRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.balance) {
      return res.status(401).json({ error: "User not authenticated or no balance" });
    }

    const {
      orderType,
      asset,
      leverage,
      qty,
      stopLoss,
      takeProfit,
    }: {
      orderType: position;
      asset: token;
      leverage: number;
      qty: number;
      stopLoss?: number;
      takeProfit?: number;
    } = req.body;

    // Validate input
    if (leverage < 1 || leverage > 100) {
      return res.status(400).json({ error: "Invalid leverage (1-100)" });
    }

    if (qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    // Get current price from Redis
    const currData = await redisClient.get(`market:${asset}`);
    if (!currData) {
      return res.status(400).json({ error: "Price data not available" });
    }
    
    const parsed = JSON.parse(currData);
    const buyPrice = orderType === "LONG" ? parsed.askPrice : parsed.bidPrice;

    // Convert to integers for precise arithmetic
    const buyPriceInt = toInteger(buyPrice);
    const qtyInt = toInteger(qty);
    const balanceInt = user.balance.balanceInt;

    // Validate inputs
    if (!isValidPrice(buyPriceInt)) {
      return res.status(400).json({ error: "Invalid price" });
    }
    if (!isValidQuantity(qtyInt)) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    // Calculate position amount and margin using integer arithmetic
    const positionAmountInt = calculatePositionAmount(qtyInt, buyPriceInt);
    const marginInt = calculateMargin(positionAmountInt, leverage);

    // Check sufficient balance
    if (!hasSufficientBalance(balanceInt, marginInt)) {
      return res.status(400).json({
        error: "Insufficient funds",
        required: formatPrice(marginInt),
        available: formatPrice(balanceInt),
      });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          status: "OPEN",
          orderType: orderType,
          asset: asset,
          leverage: leverage,
          marginInt: marginInt,
          buyPriceInt: buyPriceInt,
          qtyInt: qtyInt,
          stopLossInt: stopLoss ? toInteger(stopLoss) : 0n,
          takeProfitInt: takeProfit ? toInteger(takeProfit) : 0n,
          userId: user.id,
        },
      });

      // Update balance using integer arithmetic
      const remainingBalanceInt = subtract(balanceInt, marginInt);
      const updatedBalance = await tx.balance.update({
        where: {
          userId: user.id,
        },
        data: {
          balanceInt: remainingBalanceInt,
        },
      });

      return { order, balance: updatedBalance };
    });

    return res.json({
      success: true,
      order: result.order,
      balance: result.balance,
    });
  } catch (error) {
    console.error("Error opening order:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const closeOrder = async (req: authRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    if (!user || !user.balance) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const order = await prisma.order.findFirst({
      where: {
        orderId: orderId,
        userId: user.id, // Ensure user owns the order
        status: "OPEN",
      },
    });

    if (!order) {
      return res.status(400).json({
        error: "Order not found or already closed",
      });
    }

    const { buyPriceInt, qtyInt, marginInt, orderType, asset } = order;

    // Get current price
    const currData = await redisClient.get(`market:${asset}`);
    if (!currData) {
      return res.status(400).json({
        error: "Price data not available",
      });
    }

    const parsed = JSON.parse(currData);
    const currentPrice = orderType === "LONG" ? parsed.bidPrice : parsed.askPrice;
    const currentPriceInt = toInteger(currentPrice);

    // Calculate P&L using integer arithmetic
    const PnLInt = orderType === "LONG"
      ? calculateLongPnL(currentPriceInt, buyPriceInt, qtyInt)
      : calculateShortPnL(buyPriceInt, currentPriceInt, qtyInt);

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Close order
      const updatedOrder = await tx.order.update({
        where: {
          orderId: orderId,
        },
        data: {
          status: "CLOSED",
          finalPnLInt: PnLInt,
        },
      });

      // Return margin + P&L to balance using integer arithmetic
      const currentBalanceInt = user.balance!.balanceInt;
      const newBalanceInt = add(add(currentBalanceInt, marginInt), PnLInt);

      const updatedBalance = await tx.balance.update({
        where: {
          userId: user.id,
        },
        data: {
          balanceInt: newBalanceInt,
        },
      });

      return { order: updatedOrder, balance: updatedBalance };
    });

    return res.json({
      success: true,
      order: result.order,
      balance: result.balance,
      PnL: formatPrice(PnLInt),
    });
  } catch (error) {
    console.error("Error closing order:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const getUserOrders = async (req: authRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { status } = req.query;
    
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        ...(status && { status: status as orderStatus }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};