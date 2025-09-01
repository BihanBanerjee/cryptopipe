import { Router } from "express";
import {
  openOrder,
  closeOrder,
  getOrder,
} from "../controller/order.controller";
import { authMiddleware } from "../middleware/auth";

export const orderRouter: Router = Router();

orderRouter.post("/", authMiddleware, openOrder);
orderRouter.get("/:id", authMiddleware, getOrder);
orderRouter.post("/:id", authMiddleware, closeOrder);
