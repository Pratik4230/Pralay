function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const inngestEnv = {
  dev: optional("INNGEST_DEV") === "1" || optional("INNGEST_DEV") === "true",
  eventKey: optional("INNGEST_EVENT_KEY"),
  signingKey: optional("INNGEST_SIGNING_KEY"),
} as const;

export function isInngestDevMode(): boolean {
  return inngestEnv.dev;
}

export function hasInngestEventKey(): boolean {
  return Boolean(inngestEnv.eventKey);
}

/** Required when sending events to Inngest Cloud (not needed with INNGEST_DEV=1). */
export function getInngestEventKey(): string {
  return required("INNGEST_EVENT_KEY");
}
