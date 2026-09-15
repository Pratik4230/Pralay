import { isProduction } from "@repo/env";

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const emailEnv = {
  region: process.env.AWS_REGION ?? "ap-south-1",
  fromEmail: optional("SES_FROM_EMAIL"),
  fromName: process.env.SES_FROM_NAME ?? "Pralay",
} as const;

/** SES in production when sender is configured; console logging otherwise. */
export function isSesConfigured() {
  return isProduction && Boolean(emailEnv.fromEmail);
}
