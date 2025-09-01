import { Router } from "express";
import { register, signin, signout } from "../controller/auth.controller";
import { authMiddleware } from "../middleware/auth";

export const authRouter: Router = Router();

authRouter.post("/register", register);
authRouter.post("/signin", signin);
authRouter.post("/signout", authMiddleware, signout);