import { z } from "zod";

export const workspaceUsageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const usageTotalsSchema = z.object({
  operations: z.number().int().nonnegative(),
  failedOperations: z.number().int().nonnegative(),
  creditsUsed: z.number().int().nonnegative(),
  providerCostMicros: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export const workspaceUsageSummaryResponseSchema = z.object({
  periodDays: z.number().int().positive(),
  credits: z.object({
    balance: z.number().int(),
    lifetimeUsed: z.number().int().nonnegative(),
  }),
  totals: usageTotalsSchema,
  byModality: z.array(
    z.object({
      modality: z.string(),
      operations: z.number().int().nonnegative(),
      creditsUsed: z.number().int().nonnegative(),
    }),
  ),
  recentEvents: z.array(
    z.object({
      id: z.uuid(),
      operation: z.string(),
      modality: z.string(),
      provider: z.string(),
      model: z.string(),
      status: z.enum(["succeeded", "failed"]),
      creditsCharged: z.number().int().nonnegative(),
      latencyMs: z.number().int().nonnegative().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export type WorkspaceUsageSummary = z.infer<
  typeof workspaceUsageSummaryResponseSchema
>;
