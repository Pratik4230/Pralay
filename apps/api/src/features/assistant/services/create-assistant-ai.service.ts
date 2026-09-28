import {
  generateCreateThreadTitle,
  runCreateChatTurn,
  streamCreateChatTurn,
  type CreateChatHistoryMessage,
} from "@repo/agents";
import { hasOpenAiApiKey } from "@repo/env";
import type { CreateChatModelId } from "@repo/validators";

const PLACEHOLDER_NO_OPENAI =
  "Thanks for your message. Add OPENAI_API_KEY to enable Create chat replies.";

const MODEL_ERROR_REPLY =
  "I could not generate a reply right now. Please try again in a moment.";

export async function generateCreateAssistantReply(input: {
  chatModelId: CreateChatModelId;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
}): Promise<string> {
  if (!hasOpenAiApiKey()) {
    return PLACEHOLDER_NO_OPENAI;
  }

  try {
    return await runCreateChatTurn(input);
  } catch (error) {
    console.error("[create-assistant] chat turn failed", error);
    return MODEL_ERROR_REPLY;
  }
}

export async function* streamCreateAssistantReply(input: {
  chatModelId: CreateChatModelId;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
}): AsyncGenerator<string> {
  if (!hasOpenAiApiKey()) {
    yield PLACEHOLDER_NO_OPENAI;
    return;
  }

  try {
    yield* streamCreateChatTurn(input);
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
