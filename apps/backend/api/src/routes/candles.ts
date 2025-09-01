import { Router } from "express";
import { getCandles } from "../controller/candles.controller";

export const candleRouter: Router = Router();

candleRouter.get("/", getCandles);