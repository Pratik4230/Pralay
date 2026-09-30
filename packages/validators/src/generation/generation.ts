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
});

/** Embedded on assistant list-messages for Create generation cards (no extra GET on reload). */
export const assistantMessageGenerationSummarySchema = z.object({
  id: z.uuid(),
  status: generationStatusSchema,
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
  prompt: z.string(),
  inputAssetIds: z.array(z.uuid()),
  outputAssetIds: z.array(z.uuid()),
  outputAssets: z.array(generationOutputAssetPreviewSchema).default([]),
  aspectRatio: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
});

export const createProjectGenerationBodySchema = z.object({
  prompt: createPromptTextSchema,
  inputAssetIds: createReferenceAssetIdsSchema.default([]),
  presetKey: createPresetKeySchema.optional(),
  aspectRatio: createAspectRatioSchema.optional(),
});

export const createProjectGenerationResponseSchema = z.object({
  generation: generationSchema,
});

export const getProjectGenerationResponseSchema = z.object({
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

export type Generation = z.infer<typeof generationSchema>;
export type CreateProjectGenerationBody = z.infer<
  typeof createProjectGenerationBodySchema
>;
