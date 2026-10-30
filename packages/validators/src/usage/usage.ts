import { z } from "zod";

export const workspaceUsageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const updateWorkspaceUsageBudgetBodySchema = z.object({
  lowCreditThreshold: z.number().int().min(0).max(1_000_000),
});

export const updateProjectAiBudgetBodySchema = z.object({
  monthlyLimit: z.number().int().min(0).max(10_000_000).nullable(),
});

export const adjustWorkspaceCreditsBodySchema = z.object({
  idempotencyKey: z.uuid(),
  creditsDelta: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(200),
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
    reserved: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    lifetimeUsed: z.number().int().nonnegative(),
    lowCreditThreshold: z.number().int().nonnegative(),
    isLow: z.boolean(),
  }),
  totals: usageTotalsSchema,
  byModality: z.array(
    z.object({
      modality: z.string(),
      operations: z.number().int().nonnegative(),
      creditsUsed: z.number().int().nonnegative(),
    }),
  ),
  byProvider: z.array(
    z.object({
      provider: z.string(),
      operations: z.number().int().nonnegative(),
      creditsUsed: z.number().int().nonnegative(),
    }),
  ),
  byModel: z.array(
    z.object({
      provider: z.string(),
      model: z.string(),
      operations: z.number().int().nonnegative(),
      creditsUsed: z.number().int().nonnegative(),
    }),
  ),
  byProject: z.array(
    z.object({
      projectId: z.uuid().nullable(),
      projectName: z.string(),
      operations: z.number().int().nonnegative(),
      creditsUsed: z.number().int().nonnegative(),
      monthlyLimit: z.number().int().nonnegative().nullable(),
      monthlyUsed: z.number().int().nonnegative(),
      reserved: z.number().int().nonnegative(),
      monthlyAvailable: z.number().int().nonnegative().nullable(),
    }),
  ),
  daily: z.array(
    z.object({
      date: z.string(),
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
      inputTokens: z.number().int().nonnegative().nullable(),
      outputTokens: z.number().int().nonnegative().nullable(),
      providerRequestId: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  recentLedger: z.array(
    z.object({
      id: z.uuid(),
      creditsDelta: z.number().int(),
      balanceAfter: z.number().int().nullable(),
      reason: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export const workspaceUsageBudgetResponseSchema = z.object({
  lowCreditThreshold: z.number().int().nonnegative(),
});

export const projectAiBudgetResponseSchema = z.object({
  projectId: z.uuid(),
  monthlyLimit: z.number().int().nonnegative().nullable(),
  monthlyUsed: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  monthlyAvailable: z.number().int().nonnegative().nullable(),
});

export const workspaceCreditAdjustmentResponseSchema = z.object({
  duplicate: z.boolean(),
  balance: z.number().int(),
  available: z.number().int().nonnegative(),
});

export const notificationSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid().nullable(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  readAt: z.iso.datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});

export const notificationListResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  notifications: z.array(notificationSchema),
});

export const notificationMutationResponseSchema = z.object({
  ok: z.literal(true),
});

export type WorkspaceUsageSummary = z.infer<
  typeof workspaceUsageSummaryResponseSchema
>;
export type UpdateWorkspaceUsageBudgetBody = z.infer<
  typeof updateWorkspaceUsageBudgetBodySchema
>;
