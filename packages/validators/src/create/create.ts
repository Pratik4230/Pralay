import { z } from "zod";

import { workspaceAssetDisplayNameSchema } from "../asset/asset.js";

/** Default Create chat model (OpenAI). */
export const CREATE_CHAT_MODEL_IDS = ["gpt-5.4-mini"] as const;

/** One-shot thread title generation. */
export const CREATE_THREAD_TITLE_MODEL_ID = "gpt-5-nano" as const;

export const createChatModelIdSchema = z.enum(CREATE_CHAT_MODEL_IDS);

export const createPresetKeySchema = z.enum([
  "youtube_thumbnail",
  "instagram_post",
  "app_icon",
  "product_ad",
  "event_poster",
]);

export const createAspectRatioSchema = z
  .string()
  .trim()
  .regex(/^\d+:\d+$/, "Aspect ratio must look like 16:9");

export const createPromptTextSchema = z
  .string()
  .trim()
  .min(1, "Prompt is required")
  .max(8_000, "Prompt must be at most 8000 characters");

export const createReferenceAssetIdsSchema = z
  .array(z.uuid())
  .max(5, "At most 5 image references are supported per generation")
  .refine(
    (assetIds) => new Set(assetIds).size === assetIds.length,
    "Reference assets must be unique",
  );

export const createReferenceCandidateAssetIdsSchema = z
  .array(z.uuid())
  .max(24, "At most 24 reference candidates can be staged per message")
  .refine(
    (assetIds) => new Set(assetIds).size === assetIds.length,
    "Reference candidates must be unique",
  );

export const createAttachedAssetRefSchema = z.object({
  assetId: z.uuid(),
  name: workspaceAssetDisplayNameSchema,
});

/**
 * Body for sending a Create message (chat + optional generation intent).
 * Used by assistant stream and generation enqueue once wired.
 */
export const createProjectMessageBodySchema = z.object({
  threadId: z.uuid().optional(),
  prompt: createPromptTextSchema,
  referenceAssetIds: createReferenceCandidateAssetIdsSchema.default([]),
  chatModelId: createChatModelIdSchema.default("gpt-5.4-mini"),
  presetKey: createPresetKeySchema.optional(),
  aspectRatio: createAspectRatioSchema.optional(),
  /** When true, enqueue Grok Imagine on send without waiting for the agent tool. Default false: use start_generation. */
  enqueueGeneration: z.boolean().default(false),
});

export type CreateChatModelId = z.infer<typeof createChatModelIdSchema>;
export type CreatePresetKey = z.infer<typeof createPresetKeySchema>;
export type CreateAttachedAssetRef = z.infer<
  typeof createAttachedAssetRefSchema
>;
export type CreateProjectMessageBody = z.infer<
  typeof createProjectMessageBodySchema
>;

export const createAssetSuggestScopeSchema = z.enum(["workspace", "project"]);

export const suggestWorkspaceAssetsQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  projectId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const createAssetSuggestItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  mimeType: z.string(),
  s3Key: z.string(),
  scope: createAssetSuggestScopeSchema,
});

export const createAssetSuggestResponseSchema = z.object({
  items: z.array(createAssetSuggestItemSchema),
});

export type SuggestWorkspaceAssetsQuery = z.infer<
  typeof suggestWorkspaceAssetsQuerySchema
>;
export type CreateAssetSuggestItem = z.infer<
  typeof createAssetSuggestItemSchema
>;
export type CreateAssetSuggestResponse = z.infer<
  typeof createAssetSuggestResponseSchema
>;
