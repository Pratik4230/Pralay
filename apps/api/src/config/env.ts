function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://pralay:pralay@localhost:5432/pralay",
  ),
  nodeEnv,
  isProduction: nodeEnv === "production",
  betterAuthSecret: required(
    "BETTER_AUTH_SECRET",
    nodeEnv === "production" ? undefined : "dev-better-auth-secret-change-me",
  ),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  betterAuthTrustedOrigins: (
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    process.env.CORS_ORIGIN ??
    "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
