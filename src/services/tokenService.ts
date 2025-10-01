import jwt from "jsonwebtoken";
import { env } from "../utils/env";

interface AccessClaims {
    sc: string; // shortCode
    f?: string[]; // fileIds
}

export function signTransferAccessToken(shortCode: string, fileIds: string[], ttlSec = 300): string {
    const payload: AccessClaims = { sc: shortCode, f: fileIds };
    return jwt.sign(payload as any, env.jwtAccessSecret, { expiresIn: ttlSec });
}

export function verifyTransferAccessToken(token: string): AccessClaims {
    return jwt.verify(token, env.jwtAccessSecret) as unknown as AccessClaims;
}


