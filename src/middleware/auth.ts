import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/jwt";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: "employee" | "approver" | "admin";
        attributes?: Record<string, unknown>;
    };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Try to get token from cookie first, then Authorization header as fallback
    const cookieToken = req.cookies?.access_token;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const token = cookieToken || headerToken;

    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role, attributes: payload.attributes as Record<string, unknown> };
        console.log("this is the user", req.user);
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

export function requireRole(roles: Array<"employee" | "approver" | "admin">) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
        next();
    };
}

export function abacPolicy(check: (req: AuthenticatedRequest) => boolean) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const allowed = check(req);
        if (!allowed) return res.status(403).json({ error: "Forbidden" });
        next();
    };
}


