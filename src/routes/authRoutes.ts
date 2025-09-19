import { Router } from "express";
import { login, register, refresh, logout } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);


