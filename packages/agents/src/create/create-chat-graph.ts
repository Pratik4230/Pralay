import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { getOpenAiApiKey } from "@repo/env";
import type { CreateChatModelId } from "@repo/validators";

import { CREATE_SYSTEM_PROMPT } from "./prompts.js";

export type CreateChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RunCreateChatTurnInput = {
  chatModelId: CreateChatModelId;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
};

function buildSystemContent(
  threadSummary: string | null,
  referenceAssetIds: string[],
): string {
  const parts = [CREATE_SYSTEM_PROMPT];

  if (threadSummary?.trim()) {
    parts.push(`Earlier conversation summary:\n${threadSummary.trim()}`);
  }

  if (referenceAssetIds.length > 0) {
    parts.push(
      `Reference asset IDs for this message: ${referenceAssetIds.join(", ")}`,
    );
  }

  return parts.join("\n\n");
}

function toLangChainMessages(input: RunCreateChatTurnInput): BaseMessage[] {
  const messages: BaseMessage[] = [
    new SystemMessage(
      buildSystemContent(input.threadSummary, input.referenceAssetIds),
    ),
  ];

  for (const entry of input.history) {
    if (entry.role === "system") continue;
    if (entry.role === "user") {
      messages.push(new HumanMessage(entry.content));
    } else {
      messages.push(new AIMessage(entry.content));
    }
  }

  messages.push(new HumanMessage(input.userPrompt));
  return messages;
}

function extractMessageText(
  content: AIMessage["content"] | string | unknown,
): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => ("text" in part ? part.text : ""))
      .join("");
  }
  return "";
}

export async function* streamCreateChatTurn(
  input: RunCreateChatTurnInput,
): AsyncGenerator<string> {
  const model = new ChatOpenAI({
    apiKey: getOpenAiApiKey(),
    model: input.chatModelId,
    streaming: true,
  });

  const stream = await model.stream(toLangChainMessages(input));

  for await (const chunk of stream) {
    const delta = extractMessageText(chunk.content);
    if (delta) {
      yield delta;
    }
  }
}

export async function runCreateChatTurn(
  input: RunCreateChatTurnInput,
): Promise<string> {
  const model = new ChatOpenAI({
    apiKey: getOpenAiApiKey(),
    model: input.chatModelId,
  });

  const initialMessages = toLangChainMessages(input);

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("model", async (state) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    })
    .addEdge(START, "model")
    .addEdge("model", END)
    .compile();

  const result = await graph.invoke({ messages: initialMessages });
  const last = result.messages[result.messages.length - 1];

  if (!last) {
    throw new Error("Create chat graph returned no assistant message");
  }

  const content = extractMessageText(last.content).trim();

  if (!content.trim()) {
    throw new Error("Create chat model returned empty content");
  }

  return content.trim();
}
