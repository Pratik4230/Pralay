import { z } from "zod";

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
  .max(12, "At most 12 reference assets per message");

/** Resolved @mention attachment stored on messages / sent to the API. */
export const createAttachedAssetRefSchema = z.object({
  assetId: z.uuid(),
  name: z.string().trim().min(1).max(120),
});

/**
 * Body for sending a Create message (chat + optional generation intent).
 * Used by assistant stream and generation enqueue once wired.
 */
export const createProjectMessageBodySchema = z.object({
  threadId: z.uuid().optional(),
  prompt: createPromptTextSchema,
  referenceAssetIds: createReferenceAssetIdsSchema.default([]),
  chatModelId: createChatModelIdSchema.default("gpt-5.4-mini"),
  presetKey: createPresetKeySchema.optional(),
  aspectRatio: createAspectRatioSchema.optional(),
});

export type CreateChatModelId = z.infer<typeof createChatModelIdSchema>;
export type CreatePresetKey = z.infer<typeof createPresetKeySchema>;
export type CreateAttachedAssetRef = z.infer<typeof createAttachedAssetRefSchema>;
export type CreateProjectMessageBody = z.infer<
  typeof createProjectMessageBodySchema
>;
