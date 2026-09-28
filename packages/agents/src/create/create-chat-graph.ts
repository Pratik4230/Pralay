import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { getOpenAiApiKey } from "@repo/env";
import type { CreateChatModelId } from "@repo/validators";

import {
  createCreateChatTools,
  type CreateChatToolHandlers,
} from "./create-chat-tools.js";
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

export type CreateChatRunContext = {
  toolHandlers: CreateChatToolHandlers;
};

const MAX_TOOL_ITERATIONS = 8;

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

function extractMessageText(content: AIMessage["content"] | string | unknown): string {
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

export async function runCreateChatTurn(
  input: RunCreateChatTurnInput,
  context: CreateChatRunContext,
): Promise<string> {
  const model = new ChatOpenAI({
    apiKey: getOpenAiApiKey(),
    model: input.chatModelId,
  });

  const tools = createCreateChatTools(context.toolHandlers);
  const modelWithTools = model.bindTools(tools);

  let messages: BaseMessage[] = toLangChainMessages(input);

  for (let step = 0; step < MAX_TOOL_ITERATIONS; step += 1) {
    const response = await modelWithTools.invoke(messages);
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const content = extractMessageText(response.content).trim();
      if (!content) {
        throw new Error("Create chat model returned empty content");
      }
      return content;
    }

    messages = [...messages, response];

    for (const call of toolCalls) {
      const toolCallId = call.id ?? `${call.name}-${step}`;
      let output: string;

      try {
        if (call.name === "start_generation") {
          const aspectRatio =
            typeof call.args?.aspectRatio === "string"
              ? call.args.aspectRatio
              : undefined;
          output = JSON.stringify(
            await context.toolHandlers.startGeneration({ aspectRatio }),
          );
        } else if (call.name === "get_generation_status") {
          output = JSON.stringify(
            await context.toolHandlers.getGenerationStatus({
              generationId: String(call.args?.generationId ?? ""),
            }),
          );
        } else {
          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              content: JSON.stringify({ error: `Unknown tool: ${call.name}` }),
            }),
          );
          continue;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Tool execution failed";
        output = JSON.stringify({ error: message });
      }

      messages.push(
        new ToolMessage({
          tool_call_id: toolCallId,
          content: output,
        }),
      );
    }
  }

  throw new Error("Create chat exceeded maximum tool iterations");
}

export async function* streamCreateChatTurn(
  input: RunCreateChatTurnInput,
  context: CreateChatRunContext,
): AsyncGenerator<string> {
  const text = await runCreateChatTurn(input, context);
  const chunkSize = 32;
  for (let index = 0; index < text.length; index += chunkSize) {
    yield text.slice(index, index + chunkSize);
  }
}
