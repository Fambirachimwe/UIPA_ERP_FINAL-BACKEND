import { Router } from "express";
import { login, register, refresh } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);


