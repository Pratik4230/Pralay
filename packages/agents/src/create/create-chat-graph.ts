import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  Annotation,
  END,
  START,
  StateGraph,
  messagesStateReducer,
  type BaseCheckpointSaver,
} from "@langchain/langgraph";
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
import { getCreateChatCheckpointer } from "./create-chat-checkpointer.js";

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
  runId?: string;
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
  /** Override for tests. Production turns use the shared Postgres saver. */
  checkpointer?: BaseCheckpointSaver;
  disableCheckpointing?: boolean;
  events?: {
    onModelStart?: (iteration: number) => Promise<void> | void;
    onModelError?: (iteration: number, error: unknown) => Promise<void> | void;
    onModelEnd?: (usage: {
      iteration: number;
      provider: "openai";
      model: CreateChatModelId;
      inputTokens: number | null;
      outputTokens: number | null;
      providerRequestId: string | null;
      latencyMs: number;
    }) => Promise<void> | void;
    onTextDelta?: (delta: string) => Promise<void> | void;
    onToolStart?: (name: string) => Promise<void> | void;
    onToolEnd?: (name: string) => Promise<void> | void;
  };
};

const MAX_TOOL_ITERATIONS = 12;

const CreateChatState = Annotation.Root({
  messages: Annotation<BaseMessage[], BaseMessage | BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  iteration: Annotation<number>(),
  nextToolIndex: Annotation<number>(),
  finalText: Annotation<string>(),
  requestId: Annotation<string>(),
});

type CreateChatStateValue = typeof CreateChatState.State;
type CreateToolCall = NonNullable<AIMessage["tool_calls"]>[number];
type CreateChatStateUpdate = typeof CreateChatState.Update;

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
      `Authorized reference candidates from the current message and this thread. You may choose zero to five of these in start_generation. The list is metadata only; never invent IDs. Provenance "generated" means a completed output that can be edited:\n${JSON.stringify(input.referenceCandidates)}`,
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
          mode: args.mode === "edit" ? "edit" : "generate",
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

function latestAiToolCalls(state: CreateChatStateValue): CreateToolCall[] {
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    if (AIMessage.isInstance(message)) return message.tool_calls ?? [];
  }
  return [];
}

function createCheckpointConfig(input: RunCreateChatTurnInput) {
  if (!input.threadId || !input.userMessageId) return null;
  const checkpointThreadId = input.runId ?? input.userMessageId;
  return {
    configurable: {
      // LangGraph owns checkpoint_ns and resets it to "" for a root graph.
      // A durable assistant run therefore needs its own checkpointer thread.
      thread_id: checkpointThreadId,
      assistant_thread_id: input.threadId,
      assistant_run_id: checkpointThreadId,
    },
  };
}

export function createCreateChatWorkflow(nodes: {
  callModel: (
    state: CreateChatStateValue,
  ) => Promise<CreateChatStateUpdate> | CreateChatStateUpdate;
  callTool: (
    state: CreateChatStateValue,
  ) => Promise<CreateChatStateUpdate> | CreateChatStateUpdate;
}) {
  return new StateGraph(CreateChatState)
    .addNode("model", nodes.callModel)
    .addNode("tool", nodes.callTool)
    .addEdge(START, "model")
    .addConditionalEdges("model", (state) => (state.finalText ? END : "tool"))
    .addConditionalEdges("tool", (state) =>
      state.nextToolIndex >= latestAiToolCalls(state).length ? "model" : "tool",
    );
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

  const callModel = async (state: CreateChatStateValue) => {
    if (state.iteration >= MAX_TOOL_ITERATIONS) {
      throw new Error("Create chat exceeded maximum tool iterations");
    }

    const payload = assertSafeCreateChatPayload(state.messages);
    const modelStartedAt = Date.now();

    let response: AIMessage | AIMessageChunk;
    try {
      await context.events?.onModelStart?.(state.iteration);
      if (context.events?.onTextDelta) {
        let aggregate: AIMessageChunk | undefined;
        const stream = await modelWithTools.stream(state.messages);
        for await (const chunk of stream) {
          aggregate = aggregate ? aggregate.concat(chunk) : chunk;
          const delta = extractMessageText(chunk.content);
          if (delta) await context.events.onTextDelta(delta);
        }
        if (!aggregate) {
          throw new Error("Create chat model returned an empty stream");
        }
        response = aggregate;
      } else {
        response = await modelWithTools.invoke(state.messages);
      }
    } catch (error) {
      await context.events?.onModelError?.(state.iteration, error);
      throw error;
    }

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
      requestId: state.requestId,
      threadId: input.threadId,
      userMessageId: input.userMessageId,
      iteration: state.iteration,
      ...payload,
      toolResultChars: 0,
      inputTokens: response.usage_metadata?.input_tokens,
      outputTokens: response.usage_metadata?.output_tokens,
      rateLimits,
    });
    await context.events?.onModelEnd?.({
      iteration: state.iteration,
      provider: "openai",
      model: input.chatModelId,
      inputTokens: response.usage_metadata?.input_tokens ?? null,
      outputTokens: response.usage_metadata?.output_tokens ?? null,
      providerRequestId: response.id ?? null,
      latencyMs: Date.now() - modelStartedAt,
    });

    const toolCalls = response.tool_calls ?? [];
    let finalText = "";
    if (toolCalls.length === 0) {
      finalText = extractMessageText(response.content).trim();
      if (!finalText) {
        throw new Error("Create chat model returned empty content");
      }
    }

    return {
      messages: [response],
      iteration: state.iteration + 1,
      nextToolIndex: 0,
      finalText,
    };
  };

  const callTool = async (state: CreateChatStateValue) => {
    const call = latestAiToolCalls(state)[state.nextToolIndex];
    if (!call) throw new Error("Create chat tool checkpoint is invalid");

    const toolCallId = call.id ?? `${call.name}-${state.iteration}`;
    let output: string;
    try {
      await context.events?.onToolStart?.(call.name);
      output = await invokeToolHandler(
        call.name,
        (call.args ?? {}) as Record<string, unknown>,
        context.toolHandlers,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool execution failed";
      output = JSON.stringify({ error: message });
    } finally {
      await context.events?.onToolEnd?.(call.name);
    }

    assertSafeCreateToolResult(output);
    return {
      messages: [
        new ToolMessage({
          tool_call_id: toolCallId,
          content: output,
        }),
      ],
      nextToolIndex: state.nextToolIndex + 1,
    };
  };

  const workflow = createCreateChatWorkflow({ callModel, callTool });

  const checkpointConfig = createCheckpointConfig(input);
  const checkpointer =
    !context.disableCheckpointing && checkpointConfig
      ? (context.checkpointer ?? getCreateChatCheckpointer())
      : context.checkpointer;
  const graph = workflow.compile({ checkpointer });

  const initialState: CreateChatStateValue = {
    messages: toLangChainMessages(input),
    iteration: 0,
    nextToolIndex: 0,
    finalText: "",
    requestId: randomUUID(),
  };

  let result: CreateChatStateValue;
  if (checkpointConfig && checkpointer) {
    const snapshot = await graph.getState(checkpointConfig);
    const saved = snapshot.values as Partial<CreateChatStateValue>;
    if (saved.finalText) return saved.finalText;
    result = saved.messages?.length
      ? await graph.invoke(null, checkpointConfig)
      : await graph.invoke(initialState, checkpointConfig);
  } else {
    result = await graph.invoke(initialState);
  }

  if (!result.finalText) {
    throw new Error("Create chat graph completed without final content");
  }
  return result.finalText;
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
