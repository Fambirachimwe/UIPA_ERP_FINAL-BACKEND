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

    // Store refresh token in database
    await Token.create({
        userId: user._id,
        type: "refresh",
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Set HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';

    // Access token cookie (15 minutes)
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/'
    });

    // Refresh token cookie (7 days)
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh' // Only send to refresh endpoint
    });

    await AuditLog.create({ userId: user._id, action: "login_success", ipAddress: req.ip });
    return res.json({ user: { id: user.id, email: user.email, role: user.role } });
}

export async function refresh(req: Request, res: Response) {
    // Try to get refresh token from cookie first, then body, then header
    const token = req.cookies?.refresh_token ||
        (req.body?.refreshToken as string) ||
        (req.headers["x-refresh-token"] as string);

    if (!token) return res.status(400).json({ error: "Missing refresh token" });

    try {
        const payload = verifyRefreshToken(token);
        const found = await Token.findOne({ token, type: "refresh", userId: payload.sub });
        if (!found) return res.status(401).json({ error: "Invalid refresh token" });

        // Generate new tokens
        const newAccessToken = signAccessToken({
            sub: payload.sub,
            role: payload.role,
            attributes: payload.attributes
        });
        const newRefreshToken = signRefreshToken({
            sub: payload.sub,
            role: payload.role,
            attributes: payload.attributes
        });

        // Token rotation: invalidate old refresh token and create new one
        await Token.deleteOne({ token, type: "refresh", userId: payload.sub });
        await Token.create({
            userId: payload.sub,
            type: "refresh",
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        // Set new HTTP-only cookies
        const isProduction = process.env.NODE_ENV === 'production';

        // New access token cookie (15 minutes)
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        });

        // New refresh token cookie (7 days)
        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth/refresh'
        });

        return res.json({ success: true });
    } catch (error) {
        // If token is invalid, clean up any existing tokens for this user
        try {
            const payload = verifyRefreshToken(token);
            await Token.deleteMany({ userId: payload.sub, type: "refresh" });
        } catch { }

        return res.status(401).json({ error: "Invalid refresh token" });
    }
}

export async function logout(req: Request, res: Response) {
    try {
        // Get refresh token from cookie or request
        const refreshToken = req.cookies?.refresh_token ||
            (req.body?.refreshToken as string) ||
            (req.headers["x-refresh-token"] as string);

        // If we have a refresh token, invalidate it
        if (refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken);
                await Token.deleteMany({ userId: payload.sub, type: "refresh" });
                await AuditLog.create({ userId: payload.sub, action: "logout", ipAddress: req.ip });
            } catch {
                // Token might be invalid, but we still want to clear cookies
            }
        }

        // Clear HTTP-only cookies
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth/refresh' });

        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


