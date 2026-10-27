import {
  generateCreateThreadTitle,
  runCreateChatTurn,
  streamCreateChatTurn,
  type CreateChatHistoryMessage,
  type CreateChatRunContext,
  type CreateChatReferenceAsset,
  type CreateChatReferenceCandidate,
} from "@repo/agents";
import { hasOpenAiApiKey } from "@repo/env";
import type {
  CreateChatModelId,
  SendProjectAssistantMessageBody,
} from "@repo/validators";

import {
  createCreateChatToolHandlers,
  loadCreateAssetMetadata,
} from "./create-assistant-tool-handlers.service.js";
import type { MessageRow } from "./project-assistant.service.js";
import { mapMessage } from "./project-assistant.service.js";

const PLACEHOLDER_NO_OPENAI =
  "Thanks for your message. Add OPENAI_API_KEY to enable Create chat replies.";

const MODEL_ERROR_REPLY =
  "I could not generate a reply right now. Please try again in a moment.";

export type CreateAssistantChatContext = {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  body: SendProjectAssistantMessageBody;
  getUserMessageRow: () => MessageRow;
  setUserMessageRow: (row: MessageRow) => void;
  onGenerationLinked?: (userMessage: ReturnType<typeof mapMessage>) => void;
  referenceCandidates: CreateChatReferenceCandidate[];
  events?: CreateChatRunContext["events"];
};

function buildRunContext(
  chatContext: CreateAssistantChatContext,
): CreateChatRunContext {
  return {
    toolHandlers: createCreateChatToolHandlers(chatContext),
    events: chatContext.events,
  };
}

type ChatTurnInput = {
  chatModelId: CreateChatModelId;
  workspaceId: string;
  projectId: string;
  threadId?: string;
  userMessageId?: string;
  runId?: string;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
  referenceAssets?: CreateChatReferenceAsset[];
  referenceCandidates?: CreateChatReferenceCandidate[];
};

async function withResolvedReferenceAssets(
  input: ChatTurnInput,
): Promise<ChatTurnInput> {
  if (input.referenceAssetIds.length === 0) return input;

  return {
    ...input,
    referenceAssets: await loadCreateAssetMetadata(
      input.workspaceId,
      input.projectId,
      [...new Set(input.referenceAssetIds)],
    ),
  };
}

export async function generateCreateAssistantReply(
  input: ChatTurnInput,
  chatContext: CreateAssistantChatContext,
): Promise<string> {
  if (!hasOpenAiApiKey()) {
    return PLACEHOLDER_NO_OPENAI;
  }

  try {
    return await runCreateChatTurn(
      await withResolvedReferenceAssets(input),
      buildRunContext(chatContext),
    );
  } catch (error) {
    console.error("[create-assistant] chat turn failed", error);
    return MODEL_ERROR_REPLY;
  }
}

/**
 * Runs a turn without converting provider failures into assistant text.
 * Durable workers use this so Inngest can retry transient failures safely.
 */
export async function runCreateAssistantReply(
  input: ChatTurnInput,
  chatContext: CreateAssistantChatContext,
): Promise<string> {
  if (!hasOpenAiApiKey()) return PLACEHOLDER_NO_OPENAI;
  return runCreateChatTurn(
    await withResolvedReferenceAssets(input),
    buildRunContext(chatContext),
  );
}

export async function* streamCreateAssistantReply(
  input: ChatTurnInput,
  chatContext: CreateAssistantChatContext,
): AsyncGenerator<string> {
  if (!hasOpenAiApiKey()) {
    yield PLACEHOLDER_NO_OPENAI;
    return;
  }

  try {
    yield* streamCreateChatTurn(
      await withResolvedReferenceAssets(input),
      buildRunContext(chatContext),
    );
  } catch (error) {
    console.error("[create-assistant] chat stream failed", error);
    yield MODEL_ERROR_REPLY;
  }
}

export async function maybeGenerateCreateThreadTitle(
  userPrompt: string,
): Promise<string | null> {
  if (!hasOpenAiApiKey()) {
    return null;
  }

  try {
    return await generateCreateThreadTitle(userPrompt);
  } catch (error) {
    console.error("[create-assistant] thread title failed", error);
    return null;
  }
}
