import jwt from "jsonwebtoken";
import { env, tokenTtls } from "../utils/env";

export interface JwtPayloadBase {
    sub: string;
    role: "employee" | "approver" | "admin";
    attributes?: unknown;
}

export function signAccessToken(payload: JwtPayloadBase): string {
    return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: tokenTtls.accessTokenTtlSec });
}

export function signRefreshToken(payload: JwtPayloadBase): string {
    return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: tokenTtls.refreshTokenTtlSec });
}

export function verifyAccessToken(token: string): JwtPayloadBase {
    return jwt.verify(token, env.jwtAccessSecret) as JwtPayloadBase;
}

export function verifyRefreshToken(token: string): JwtPayloadBase {
    return jwt.verify(token, env.jwtRefreshSecret) as JwtPayloadBase;
}


