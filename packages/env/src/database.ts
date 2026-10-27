function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const developmentDatabaseUrl =
  "postgresql://pralay:pralay@localhost:5432/pralay";

export function getDatabaseUrl(): string {
  const value = optional("DATABASE_URL");
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return developmentDatabaseUrl;
  throw new Error("Missing required environment variable: DATABASE_URL");
}
