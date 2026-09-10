function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://pralay:pralay@localhost:5432/pralay",
  ),
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
