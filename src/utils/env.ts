import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { z } from "zod";

const backendEnvPath = path.resolve(process.cwd(), "backend/.env");
const rootEnvPath = path.resolve(process.cwd(), ".env");
const envPath = fs.existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath;
dotenv.config({ path: envPath });

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.string().default("4000"),
    MONGO_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL: z.string().default("1h"),
    REFRESH_TOKEN_TTL: z.string().default("7d"),
    // Email Configuration (optional for development)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    // Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = {
    nodeEnv: parsed.data.NODE_ENV,
    port: Number(parsed.data.PORT) || 4000,
    mongoUri: parsed.data.MONGO_URI,
    jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessTokenTtl: parsed.data.ACCESS_TOKEN_TTL,
    refreshTokenTtl: parsed.data.REFRESH_TOKEN_TTL,
    // Cloudinary Configuration
    cloudinary: {
        cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
        apiKey: parsed.data.CLOUDINARY_API_KEY,
        apiSecret: parsed.data.CLOUDINARY_API_SECRET,
    },
};

function parseTtlToSeconds(input: string): number {
    const match = String(input).trim().match(/^(\d+)([smhd])?$/i);
    if (!match) return Number(input) || 0;
    const value = Number(match[1]);
    const unit = (match[2] || "s").toLowerCase();
    if (unit === "s") return value;
    if (unit === "m") return value * 60;
    if (unit === "h") return value * 3600;
    if (unit === "d") return value * 86400;
    return value;
}

export const tokenTtls = {
    accessTokenTtlSec: parseTtlToSeconds(env.accessTokenTtl),
    refreshTokenTtlSec: parseTtlToSeconds(env.refreshTokenTtl),
};


