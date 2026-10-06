import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "node:crypto";

import { getOpenAiApiKey } from "@repo/env";
import type { CreateChatModelId } from "@repo/validators";

import {
  createCreateChatTools,
  type CreateChatToolHandlers,
} from "./create-chat-tools.js";
import { CREATE_SYSTEM_PROMPT } from "./prompts.js";
import {
  assertSafeCreateChatPayload,
  assertSafeCreateToolResult,
  logCreateChatPayloadTelemetry,
} from "./create-chat-payload-safety.js";

export type CreateChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** Safe, compact context for references explicitly selected with @ on this turn. */
export type CreateChatReferenceAsset = {
  id: string;
  name: string;
  category:
    "person" | "logo" | "product" | "background" | "reference" | "other";
  tags: string[];
  mimeType: string;
  width: number | null;
  height: number | null;
  scope: "workspace" | "project";
  description: string | null;
};

export type CreateChatReferenceCandidate = CreateChatReferenceAsset & {
  provenance: "current" | "history" | "generated";
  sourceMessageId: string | null;
  sourceGenerationId: string | null;
  isGenerated: boolean;
};

export type RunCreateChatTurnInput = {
  chatModelId: CreateChatModelId;
  workspaceId: string;
  projectId: string;
  threadId?: string;
  userMessageId?: string;
  threadSummary: string | null;
  history: CreateChatHistoryMessage[];
  userPrompt: string;
  referenceAssetIds: string[];
  /** Resolved metadata only. Never includes URLs, bytes, or image content. */
  referenceAssets?: CreateChatReferenceAsset[];
  /** Authorized metadata-only candidates collected from this thread. */
  referenceCandidates?: CreateChatReferenceCandidate[];
};

export type CreateChatRunContext = {
  toolHandlers: CreateChatToolHandlers;
};

const MAX_TOOL_ITERATIONS = 12;

function buildSystemContent(input: RunCreateChatTurnInput): string {
  const parts = [CREATE_SYSTEM_PROMPT];

  if (input.threadSummary?.trim()) {
    parts.push(`Earlier conversation summary:\n${input.threadSummary.trim()}`);
  }

  if (input.referenceAssets && input.referenceAssets.length > 0) {
    parts.push(
      `Resolved @ reference assets selected by the user for this message. Treat these as strong authorized candidates. Do not search for, ask to confirm, or reject these assets again, but choose only those useful to the result:\n${JSON.stringify(input.referenceAssets)}`,
    );
  } else if (input.referenceAssetIds.length > 0) {
    parts.push(
      `User attached reference asset IDs with @ on this message: ${input.referenceAssetIds.join(", ")}`,
    );
  }

  if (input.referenceCandidates && input.referenceCandidates.length > 0) {
    parts.push(
      `Authorized reference candidates from the current message and this thread. You may choose zero to five of these in start_generation. The list is metadata only; never invent IDs. Provenance "generated" means a completed output that can be used as the base for a variation:\n${JSON.stringify(input.referenceCandidates)}`,
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

function extractMessageText(
  content: AIMessage["content"] | string | unknown,
): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => ("text" in part ? part.text : "")).join("");
  }
  return "";
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
          limit: typeof args.limit === "number" ? args.limit : undefined,
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
    case "web_search":
      return JSON.stringify(
        await handlers.webSearch({
          query: String(args.query ?? ""),
        }),
      );
    case "start_generation":
      return JSON.stringify(
        await handlers.startGeneration({
          mode:
            args.mode === "edit" || args.mode === "variation"
              ? args.mode
              : "generate",
          aspectRatio:
            typeof args.aspectRatio === "string" ? args.aspectRatio : undefined,
          prompt: typeof args.prompt === "string" ? args.prompt : undefined,
          references: Array.isArray(args.references)
            ? (args.references as Array<{ assetId: string; role: string }>)
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
  const requestId = randomUUID();

  for (let step = 0; step < MAX_TOOL_ITERATIONS; step += 1) {
    const payload = assertSafeCreateChatPayload(messages);
    const response = await modelWithTools.invoke(messages);
    const metadata = response.response_metadata as {
      headers?: Record<string, string>;
    };
    const headers = metadata.headers;
    const rateLimits = headers
      ? Object.fromEntries(
          Object.entries(headers).filter(([key]) =>
            key.startsWith("x-ratelimit-"),
          ),
        )
      : undefined;
    logCreateChatPayloadTelemetry({
      requestId,
      threadId: input.threadId,
      userMessageId: input.userMessageId,
      iteration: step,
      ...payload,
      toolResultChars: 0,
      inputTokens: response.usage_metadata?.input_tokens,
      outputTokens: response.usage_metadata?.output_tokens,
      rateLimits,
    });
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

      assertSafeCreateToolResult(output);

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
