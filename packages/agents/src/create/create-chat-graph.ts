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
  workspaceId: string;
  projectId: string;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
};

export type CreateChatRunContext = {
  toolHandlers: CreateChatToolHandlers;
  pendingVisionPreviews: Array<{ name: string; url: string }>;
};

const MAX_TOOL_ITERATIONS = 12;

function buildSystemContent(input: RunCreateChatTurnInput): string {
  const parts = [CREATE_SYSTEM_PROMPT];

  if (input.threadSummary?.trim()) {
    parts.push(`Earlier conversation summary:\n${input.threadSummary.trim()}`);
  }

  if (input.referenceAssetIds.length > 0) {
    parts.push(
      `User attached reference asset IDs with @ on this message: ${input.referenceAssetIds.join(", ")}`,
    );
  }

  return parts.join("\n\n");
}

function toLangChainMessages(input: RunCreateChatTurnInput): BaseMessage[] {
  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemContent(input)),
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

function flushVisionPreviews(
  messages: BaseMessage[],
  pending: Array<{ name: string; url: string }>,
): BaseMessage[] {
  if (pending.length === 0) {
    return messages;
  }

  const items = pending.splice(0, pending.length);
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: `Library asset previews: ${items.map((item) => item.name).join(", ")}`,
    },
  ];

  for (const item of items) {
    content.push({
      type: "image_url",
      image_url: { url: item.url },
    });
  }

  return [...messages, new HumanMessage({ content })];
}

async function invokeToolHandler(
  name: string,
  args: Record<string, unknown>,
  handlers: CreateChatToolHandlers,
): Promise<string> {
  switch (name) {
    case "search_assets":
      return JSON.stringify(
        await handlers.searchAssets({
          query: String(args.query ?? ""),
          limit:
            typeof args.limit === "number" ? args.limit : undefined,
        }),
      );
    case "inspect_assets":
      return JSON.stringify(
        await handlers.inspectAssets({
          assetIds: Array.isArray(args.assetIds)
            ? (args.assetIds as string[])
            : [],
        }),
      );
    case "link_reference_assets":
      return JSON.stringify(
        await handlers.linkReferenceAssets({
          assetIds: Array.isArray(args.assetIds)
            ? (args.assetIds as string[])
            : [],
        }),
      );
    case "web_search":
      return JSON.stringify(
        await handlers.webSearch({
          query: String(args.query ?? ""),
        }),
      );
    case "start_generation":
      return JSON.stringify(
        await handlers.startGeneration({
          aspectRatio:
            typeof args.aspectRatio === "string"
              ? args.aspectRatio
              : undefined,
          prompt:
            typeof args.prompt === "string" ? args.prompt : undefined,
          referenceAssetIds: Array.isArray(args.referenceAssetIds)
            ? (args.referenceAssetIds as string[])
            : undefined,
        }),
      );
    case "get_generation_status":
      return JSON.stringify(
        await handlers.getGenerationStatus({
          generationId: String(args.generationId ?? ""),
        }),
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
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
    messages = flushVisionPreviews(messages, context.pendingVisionPreviews);

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
        output = await invokeToolHandler(
          call.name,
          (call.args ?? {}) as Record<string, unknown>,
          context.toolHandlers,
        );
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

export { runOpenAiWebSearch } from "./openai-web-search.js";
