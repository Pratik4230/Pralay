import type { SendProjectAssistantMessageBody } from "@repo/validators";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import {
  generateCreateAssistantReply,
  maybeGenerateCreateThreadTitle,
  streamCreateAssistantReply,
  type CreateAssistantChatContext,
} from "./create-assistant-ai.service.js";
import { loadCreateChatHistory } from "./create-chat-context.js";
import {
  attachGenerationToAssistantUserMessage,
  StorageNotConfiguredError,
} from "../../generations/services/project-generations.service.js";
import type { MessageRow, ThreadRow } from "./project-assistant.service.js";
import {
  AssistantThreadNotFoundError,
  mapMessage,
  mapThread,
  persistProjectAssistantUserMessage,
} from "./project-assistant.service.js";

export type AssistantMessageStreamEvent =
  | {
      type: "meta";
      thread: ReturnType<typeof mapThread>;
      userMessage: ReturnType<typeof mapMessage>;
    }
  | {
      type: "generation";
      userMessage: ReturnType<typeof mapMessage>;
    }
  | { type: "text"; delta: string }
  | {
      type: "done";
      thread: ReturnType<typeof mapThread>;
      assistantMessage: ReturnType<typeof mapMessage>;
    }
  | { type: "error"; message: string }
  | { type: "ping" };

function encodeStreamEvent(event: AssistantMessageStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function completeAssistantTurn(input: {
  threadRow: ThreadRow;
  userMessageRow: MessageRow;
  prompt: string;
  assistantContent: string;
}) {
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assistantMessages)
    .where(eq(assistantMessages.threadId, input.threadRow.id));

  const messageCount = countResult[0]?.count ?? 0;
  const isFirstTurn = messageCount === 1;
  let nextTitle = input.threadRow.title;
  if (isFirstTurn && input.threadRow.titleAuto && !input.threadRow.title) {
    nextTitle = await maybeGenerateCreateThreadTitle(input.prompt);
  }

  const now = new Date();

  const [assistantMessageRow] = await db
    .insert(assistantMessages)
    .values({
      threadId: input.threadRow.id,
      role: "assistant",
      content: input.assistantContent,
      referenceAssetIds: [],
    })
    .returning();

  if (!assistantMessageRow) {
    throw new Error("Failed to save assistant message");
  }

  const [updatedThread] = await db
    .update(assistantThreads)
    .set({
      updatedAt: now,
      ...(nextTitle ? { title: nextTitle } : {}),
    })
    .where(eq(assistantThreads.id, input.threadRow.id))
    .returning();

  return {
    thread: mapThread(updatedThread ?? { ...input.threadRow, updatedAt: now }),
    assistantMessage: mapMessage(assistantMessageRow),
  };
}

function buildChatContext(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
  userMessageRef: { row: MessageRow },
  onGenerationLinked: CreateAssistantChatContext["onGenerationLinked"],
): CreateAssistantChatContext {
  return {
    actorUserId,
    workspaceId,
    projectId,
    body,
    getUserMessageRow: () => userMessageRef.row,
    setUserMessageRow: (row) => {
      userMessageRef.row = row;
    },
    onGenerationLinked,
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

const STREAM_KEEPALIVE_MS = 12_000;

/** Emit `{ type: "ping" }` while waiting on long tool loops (keeps HTTP chunk stream alive). */
async function* withStreamKeepalive(
  source: AsyncIterable<string>,
): AsyncGenerator<string | { type: "ping" }> {
  const iterator = source[Symbol.asyncIterator]();
  let pending = iterator.next();

  while (true) {
    const raced = await Promise.race([
      pending.then((result) => ({ kind: "item" as const, result })),
      sleep(STREAM_KEEPALIVE_MS).then(() => ({ kind: "ping" as const })),
    ]);

    if (raced.kind === "ping") {
      yield { type: "ping" };
      continue;
    }

    const { value, done } = raced.result;
    if (done) break;
    yield value;
    pending = iterator.next();
  }
}

function* drainSideChannel(
  sideChannel: AssistantMessageStreamEvent[],
): Generator<AssistantMessageStreamEvent> {
  while (sideChannel.length > 0) {
    const event = sideChannel.shift();
    if (event) yield event;
  }
}

/**
 * NDJSON assistant turn events. Uses AsyncGenerator + Response (Bun-safe);
 * avoid ReadableStreamDefaultController.enqueue after long async tool loops.
 */
export async function* iterateProjectAssistantMessageStream(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
): AsyncGenerator<AssistantMessageStreamEvent> {
  const sideChannel: AssistantMessageStreamEvent[] = [];

  try {
    const persisted = await persistProjectAssistantUserMessage(
      actorUserId,
      workspaceId,
      projectId,
      body,
    );

    let { threadRow, userMessageRow } = persisted;
    const userMessageRef = { row: userMessageRow };

    if (body.enqueueGeneration) {
      try {
        const linked = await attachGenerationToAssistantUserMessage({
          actorUserId,
          workspaceId,
          projectId,
          messageId: userMessageRow.id,
          prompt: body.prompt,
          inputAssetIds: body.referenceAssetIds,
          aspectRatio: body.aspectRatio,
        });
        userMessageRow = linked.userMessageRow;
        userMessageRef.row = userMessageRow;
      } catch (error) {
        if (!(error instanceof StorageNotConfiguredError)) {
          throw error;
        }
      }
    }

    yield {
      type: "meta",
      thread: mapThread(threadRow),
      userMessage: mapMessage(userMessageRow),
    };

    const history = await loadCreateChatHistory(threadRow.id, {
      id: userMessageRow.id,
      createdAt: userMessageRow.createdAt,
    });

    const chatContext = buildChatContext(
      actorUserId,
      workspaceId,
      projectId,
      body,
      userMessageRef,
      (userMessage) => {
        sideChannel.push({ type: "generation", userMessage });
      },
    );

    const turnInput = {
      chatModelId: body.chatModelId,
      workspaceId,
      projectId,
      threadSummary: threadRow.summary,
      history,
      userPrompt: body.prompt,
      referenceAssetIds: body.referenceAssetIds,
    };

    let assistantContent = "";
    for await (const chunk of withStreamKeepalive(
      streamCreateAssistantReply(turnInput, chatContext),
    )) {
      yield* drainSideChannel(sideChannel);
      if (typeof chunk === "string") {
        assistantContent += chunk;
        yield { type: "text", delta: chunk };
      } else {
        yield chunk;
      }
    }

    yield* drainSideChannel(sideChannel);

    assistantContent = assistantContent.trim();
    if (!assistantContent) {
      assistantContent = await generateCreateAssistantReply(
        turnInput,
        chatContext,
      );
    }

    const completed = await completeAssistantTurn({
      threadRow,
      userMessageRow: userMessageRef.row,
      prompt: body.prompt,
      assistantContent,
    });

    yield {
      type: "done",
      thread: completed.thread,
      assistantMessage: completed.assistantMessage,
    };
  } catch (error) {
    if (error instanceof AssistantThreadNotFoundError) {
      yield { type: "error", message: "Thread not found" };
      return;
    }
    console.error("[create-assistant] stream failed", error);
    yield {
      type: "error",
      message: "Something went wrong while streaming the reply.",
    };
  }
}

/** NDJSON byte stream with explicit close (Bun + browser friendly). */
export function createProjectAssistantMessageStream(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
): ReadableStream<Uint8Array> {
  const events = iterateProjectAssistantMessageStream(
    actorUserId,
    workspaceId,
    projectId,
    body,
  );
  const iterator = events[Symbol.asyncIterator]();

  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encodeStreamEvent(value));
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      // Best-effort abort; generator may still finish the HTTP handler.
    },
  });
}
