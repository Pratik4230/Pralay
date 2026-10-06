import { z } from "zod";

import { createApiError } from "../common/api-error.js";
import {
  createProjectMessageBodySchema,
  createReferenceCandidateAssetIdsSchema,
} from "../create/create.js";
import { assistantMessageGenerationSummarySchema } from "../generation/generation.js";

export const assistantMessageRoleSchema = z.enum([
  "user",
  "assistant",
  "system",
]);

export const assistantThreadSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  createdBy: z.string(),
  title: z.string().nullable(),
  titleAuto: z.boolean(),
  summary: z.string().nullable(),
  summaryThroughMessageId: z.uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const assistantMessageSchema = z.object({
  id: z.uuid(),
  threadId: z.uuid(),
  role: assistantMessageRoleSchema,
  content: z.string(),
  referenceAssetIds: createReferenceCandidateAssetIdsSchema,
  generationId: z.uuid().nullable(),
  generation: assistantMessageGenerationSummarySchema.nullable().optional(),
  createdAt: z.string(),
});

export const listProjectAssistantThreadsResponseSchema = z.object({
  threads: z.array(assistantThreadSchema),
});

export const createProjectAssistantThreadBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters")
    .optional(),
});

export const createProjectAssistantThreadResponseSchema = z.object({
  thread: assistantThreadSchema,
});

export const deleteProjectAssistantThreadResponseSchema = z.object({
  success: z.literal(true),
});

export const listProjectAssistantMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).optional(),
});

export const assistantMessageListCursorPayloadSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export const listProjectAssistantMessagesResponseSchema = z.object({
  messages: z.array(assistantMessageSchema),
  nextCursor: z.string().nullable(),
});

export const sendProjectAssistantMessageBodySchema =
  createProjectMessageBodySchema;

export const sendProjectAssistantMessageResponseSchema = z.object({
  thread: assistantThreadSchema,
  userMessage: assistantMessageSchema,
  assistantMessage: assistantMessageSchema.nullable(),
});

/**
 * Async submit: returns user message immediately; assistant reply arrives
 * later and is picked up by polling GET /messages.
 */
export const submitProjectAssistantMessageResponseSchema = z.object({
  thread: assistantThreadSchema,
  userMessage: assistantMessageSchema,
});

export const assistantThreadNotFoundError = createApiError(
  "NOT_FOUND",
  "Thread not found",
);

export type AssistantThread = z.infer<typeof assistantThreadSchema>;
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type ListProjectAssistantMessagesQuery = z.infer<
  typeof listProjectAssistantMessagesQuerySchema
>;
export type SendProjectAssistantMessageBodyInput = z.input<
  typeof sendProjectAssistantMessageBodySchema
>;

export type SendProjectAssistantMessageBody = z.infer<
  typeof sendProjectAssistantMessageBodySchema
>;
export type CreateProjectAssistantThreadBody = z.infer<
  typeof createProjectAssistantThreadBodySchema
>;

export const assistantMessageStreamMetaEventSchema = z.object({
  type: z.literal("meta"),
  thread: assistantThreadSchema,
  userMessage: assistantMessageSchema,
});

export const assistantMessageStreamTextEventSchema = z.object({
  type: z.literal("text"),
  delta: z.string(),
});

export const assistantMessageStreamDoneEventSchema = z.object({
  type: z.literal("done"),
  thread: assistantThreadSchema,
  outcome: z.enum(["assistant_message", "generation_started"]),
  assistantMessage: assistantMessageSchema.nullable(),
});

export const assistantMessageStreamErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const assistantMessageStreamGenerationEventSchema = z.object({
  type: z.literal("generation"),
  userMessage: assistantMessageSchema,
});

export const assistantMessageStreamPingEventSchema = z.object({
  type: z.literal("ping"),
});

export const assistantMessageStreamEventSchema = z.discriminatedUnion("type", [
  assistantMessageStreamMetaEventSchema,
  assistantMessageStreamGenerationEventSchema,
  assistantMessageStreamTextEventSchema,
  assistantMessageStreamDoneEventSchema,
  assistantMessageStreamErrorEventSchema,
  assistantMessageStreamPingEventSchema,
]);
