import type {
  AssistantMessage,
  AssistantThread,
  SendProjectAssistantMessageBodyInput,
} from "@repo/validators";
import {
  listProjectAssistantMessagesResponseSchema,
  listProjectAssistantThreadsResponseSchema,
  sendProjectAssistantMessageResponseSchema,
  submitProjectAssistantMessageResponseSchema,
} from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

export function fetchProjectAssistantThreads(
  workspaceId: string,
  projectId: string,
) {
  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/threads`,
  ).then((data) => listProjectAssistantThreadsResponseSchema.parse(data));
}

export function fetchProjectAssistantMessages(
  workspaceId: string,
  projectId: string,
  threadId: string,
  options?: { limit?: number; cursor?: string },
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const query = params.toString();

  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/threads/${threadId}/messages${query ? `?${query}` : ""}`,
  ).then((data) => listProjectAssistantMessagesResponseSchema.parse(data));
}

/** Synchronous send — waits for the full agent turn and returns both messages. */
export function sendProjectAssistantMessage(
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBodyInput,
) {
  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/messages`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  ).then((data) => sendProjectAssistantMessageResponseSchema.parse(data));
}

/**
 * Async submit — persists the user message and returns immediately.
 * The agent turn runs in the background; the assistant reply appears
 * later and is picked up via polling GET /messages.
 */
export function submitProjectAssistantMessage(
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBodyInput,
) {
  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/messages/submit`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  ).then((data) => submitProjectAssistantMessageResponseSchema.parse(data));
}

export function createProjectAssistantThread(
  workspaceId: string,
  projectId: string,
  body?: { title?: string },
) {
  return fetchApiClient<{ thread: AssistantThread }>(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/threads`,
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}

export type {
  AssistantMessage,
  AssistantThread,
  SendProjectAssistantMessageBodyInput,
};