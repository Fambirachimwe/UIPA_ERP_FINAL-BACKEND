import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt";
import { Token } from "../models/Token";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["employee", "approver", "admin"]).default("employee"),
    attributes: z.object({ department: z.string().optional(), employee_id: z.string().optional(), approval_level: z.string().optional() }).partial().default({}),
});

export async function register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password, role, attributes } = parsed.data;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, attributes });
    return res.status(201).json({ id: user.id, email: user.email, role: user.role, attributes: user.attributes });
}

export async function login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) {
        await AuditLog.create({ action: "login_failure", ipAddress: req.ip });
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        await AuditLog.create({ userId: user._id, action: "login_failure", ipAddress: req.ip });
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const payload = { sub: String(user._id), role: user.role, attributes: user.attributes };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const decoded = verifyRefreshToken(refreshToken);
    await Token.create({ userId: user._id, type: "refresh", token: refreshToken, expiresAt: new Date((Date.now() + 7 * 24 * 60 * 60 * 1000)) });
    await AuditLog.create({ userId: user._id, action: "login_success", ipAddress: req.ip });
    return res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
}

export async function refresh(req: Request, res: Response) {
    const token = (req.body?.refreshToken as string) || (req.headers["x-refresh-token"] as string);
    if (!token) return res.status(400).json({ error: "Missing refresh token" });
    try {
        const payload = verifyRefreshToken(token);
        const found = await Token.findOne({ token, type: "refresh", userId: payload.sub });
        if (!found) return res.status(401).json({ error: "Invalid refresh token" });
        const accessToken = signAccessToken({ sub: payload.sub, role: payload.role, attributes: payload.attributes });
        return res.json({ accessToken });
    } catch {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
}


