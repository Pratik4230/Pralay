import { isProduction, nodeEnv } from "@repo/env";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const defaultAppOrigin = "http://localhost:3000";
const appOrigin = process.env.CORS_ORIGIN ?? defaultAppOrigin;

export const authEnv = {
  nodeEnv,
  isProduction,
  secret: required(
    "BETTER_AUTH_SECRET",
    nodeEnv === "production" ? undefined : "dev-better-auth-secret-change-me",
  ),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [appOrigin] as string[],
  google: {
    clientId: optional("GOOGLE_CLIENT_ID"),
    clientSecret: optional("GOOGLE_CLIENT_SECRET"),
  },
  github: {
    clientId: optional("GITHUB_CLIENT_ID"),
    clientSecret: optional("GITHUB_CLIENT_SECRET"),
  },
} as const;

export function getSocialProviders() {
  const providers: Record<
    string,
    { clientId: string; clientSecret: string }
  > = {};

  if (authEnv.google.clientId && authEnv.google.clientSecret) {
    providers.google = {
      clientId: authEnv.google.clientId,
      clientSecret: authEnv.google.clientSecret,
    };
  }

  if (authEnv.github.clientId && authEnv.github.clientSecret) {
    providers.github = {
      clientId: authEnv.github.clientId,
      clientSecret: authEnv.github.clientSecret,
    };
  }

  return providers;
}
