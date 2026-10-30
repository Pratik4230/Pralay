import type { AiUsageMetrics, AiUsageModality } from "@repo/db/schema";

export const DEFAULT_WORKSPACE_CREDITS = 5_000;
export const AI_CREDIT_POLICY_VERSION = "2026-10-29";

function positive(value: number | null | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.ceil(value!) : 0;
}

/**
 * Internal product credits, intentionally independent from provider currency.
 * Provider costs are stored separately in micros and can change without
 * rewriting historical credit transactions.
 */
export function calculateUsageCredits(input: {
  modality: AiUsageModality;
  metrics?: AiUsageMetrics;
  inputTokens?: number | null;
  outputTokens?: number | null;
}) {
  const metrics = input.metrics ?? {};
  switch (input.modality) {
    case "text":
    case "embedding": {
      const tokens =
        positive(input.inputTokens) + positive(input.outputTokens) ||
        positive(metrics.tokens);
      return tokens > 0 ? Math.max(1, Math.ceil(tokens / 1_000)) : 0;
    }
    case "image":
      return positive(metrics.outputImages ?? 1) * 40;
    case "audio":
      return Math.ceil(
        (positive(metrics.inputSeconds) + positive(metrics.outputSeconds)) / 10,
      );
    case "video":
      return positive(metrics.outputSeconds) * 10;
    case "tool":
      return positive(metrics.requests ?? 1);
    case "other":
      return 0;
  }
}
