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

/** AI provider secrets (optional until Create / generation routes run). */
export const aiEnv = {
  openaiApiKey: optional("OPENAI_API_KEY"),
  xaiApiKey: optional("XAI_API_KEY"),
} as const;

export function hasOpenAiApiKey(): boolean {
  return Boolean(aiEnv.openaiApiKey);
}

export function hasXaiApiKey(): boolean {
  return Boolean(aiEnv.xaiApiKey);
}

/** Call from OpenAI chat / title routes only. */
export function getOpenAiApiKey(): string {
  return required("OPENAI_API_KEY");
}

/** Call from Grok Imagine / xAI routes only. */
export function getXaiApiKey(): string {
  return required("XAI_API_KEY");
}
