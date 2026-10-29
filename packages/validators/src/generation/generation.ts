import { z } from "zod";

import { createApiError } from "../common/api-error.js";
import {
  createAspectRatioSchema,
  createPresetKeySchema,
  createPromptTextSchema,
  createReferenceAssetIdsSchema,
} from "../create/create.js";

export const generationStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const generationTypeSchema = z.enum([
  "generate",
  "edit",
  "variation",
  "resize",
  "batch_item",
]);

export const generationOutputAssetPreviewSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  s3Key: z.string(),
  mimeType: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  sizeBytes: z.number().int().nonnegative(),
});

export const generationEventSchema = z.object({
  id: z.uuid(),
  status: generationStatusSchema,
  createdAt: z.iso.datetime(),
});

/** Embedded on assistant list-messages for Create generation cards (no extra GET on reload). */
export const assistantMessageGenerationSummarySchema = z.object({
  id: z.uuid(),
  status: generationStatusSchema,
  type: generationTypeSchema,
  parentGenerationId: z.uuid().nullable(),
  prompt: z.string(),
  errorMessage: z.string().nullable(),
  outputAssets: z.array(generationOutputAssetPreviewSchema).default([]),
});

export type AssistantMessageGenerationSummary = z.infer<
  typeof assistantMessageGenerationSummarySchema
>;

export const generationSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid().nullable(),
  status: generationStatusSchema,
  type: generationTypeSchema,
  parentGenerationId: z.uuid().nullable(),
  prompt: z.string(),
  inputAssetIds: z.array(z.uuid()),
  inputAssets: z.array(generationOutputAssetPreviewSchema),
  outputAssetIds: z.array(z.uuid()),
  outputAssets: z.array(generationOutputAssetPreviewSchema).default([]),
  events: z.array(generationEventSchema),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  aspectRatio: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
});

export const createProjectGenerationBodySchema = z
  .object({
    type: z.enum(["generate", "resize"]).default("generate"),
    prompt: createPromptTextSchema,
    inputAssetIds: createReferenceAssetIdsSchema.default([]),
    presetKey: createPresetKeySchema.optional(),
    aspectRatio: createAspectRatioSchema.optional(),
    width: z.number().int().min(1).max(8_192).optional(),
    height: z.number().int().min(1).max(8_192).optional(),
  })
  .superRefine((value, context) => {
    if (value.type !== "resize") return;
    if (value.inputAssetIds.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["inputAssetIds"],
        message: "Resize requires exactly one source image",
      });
    }
    if (!value.width || !value.height) {
      context.addIssue({
        code: "custom",
        path: ["width"],
        message: "Resize requires width and height",
      });
    } else if (value.width * value.height > 40_000_000) {
      context.addIssue({
        code: "custom",
        path: ["width"],
        message: "Resize output must not exceed 40 megapixels",
      });
    }
  });

export const createProjectGenerationResponseSchema = z.object({
  generation: generationSchema,
});

export const getProjectGenerationResponseSchema = z.object({
  generation: generationSchema,
});

export const generationHistoryRevisionSchema = z.object({
  generationId: z.uuid(),
  parentGenerationId: z.uuid().nullable(),
  type: generationTypeSchema,
  asset: generationOutputAssetPreviewSchema,
  inputAsset: generationOutputAssetPreviewSchema.nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});

export const getProjectGenerationHistoryResponseSchema = z.object({
  currentGenerationId: z.uuid(),
  sourceAsset: generationOutputAssetPreviewSchema.nullable(),
  revisions: z.array(generationHistoryRevisionSchema),
});

export const retryProjectGenerationResponseSchema = z.object({
  generation: generationSchema,
});

export const generationNotFoundError = createApiError(
  "NOT_FOUND",
  "Generation not found",
);

export const invalidGenerationInputAssetsError = createApiError(
  "VALIDATION_ERROR",
  "One or more reference assets are invalid for this project",
);

export const generationNotRetryableError = createApiError(
  "CONFLICT",
  "Only failed generations can be retried",
);

export type Generation = z.infer<typeof generationSchema>;
export type GenerationHistoryRevision = z.infer<
  typeof generationHistoryRevisionSchema
>;
export type ProjectGenerationHistory = z.infer<
  typeof getProjectGenerationHistoryResponseSchema
>;
export type CreateProjectGenerationBody = z.infer<
  typeof createProjectGenerationBodySchema
>;
