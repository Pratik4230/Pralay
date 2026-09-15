import { isProduction, nodeEnv } from "@repo/env";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const defaultAppOrigin = "http://localhost:3000";

/** Public web app origin (Next.js). Used for CORS, auth cookies, and invite links. */
const appOrigin = process.env.CORS_ORIGIN ?? defaultAppOrigin;

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  /** Same as appOrigin; invite emails and other links target the web app. */
  appOrigin,
  corsOrigin: appOrigin,
  webAppUrl: appOrigin,
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://pralay:pralay@localhost:5432/pralay",
  ),
  nodeEnv,
  isProduction,
  betterAuthSecret: required(
    "BETTER_AUTH_SECRET",
    nodeEnv === "production" ? undefined : "dev-better-auth-secret-change-me",
  ),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  betterAuthTrustedOrigins: [appOrigin],
} as const;
