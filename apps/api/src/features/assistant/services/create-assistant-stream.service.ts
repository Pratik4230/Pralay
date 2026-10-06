import type { SendProjectAssistantMessageBody } from "@repo/validators";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import {
  generateCreateAssistantReply,
  maybeGenerateCreateThreadTitle,
  type CreateAssistantChatContext,
} from "./create-assistant-ai.service.js";
import {
  loadCreateChatHistory,
  loadCreateReferenceCandidates,
} from "./create-chat-context.js";
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
import { createHeartbeatNdjsonStream } from "./heartbeat-ndjson-stream.js";

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
      outcome: "assistant_message" | "generation_started";
      assistantMessage: ReturnType<typeof mapMessage> | null;
    }
  | { type: "error"; message: string }
  | { type: "ping" };

function encodeStreamEvent(event: AssistantMessageStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

const STREAM_HEARTBEAT_MS = 8_000;

export async function completeAssistantTurn(input: {
  threadRow: ThreadRow;
  userMessageRow: MessageRow;
  prompt: string;
  assistantContent: string | null;
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

  const assistantMessageRow = input.assistantContent
    ? (
        await db
          .insert(assistantMessages)
          .values({
            threadId: input.threadRow.id,
            role: "assistant",
            content: input.assistantContent,
            referenceAssetIds: [],
          })
          .returning()
      )[0]
    : null;

  if (input.assistantContent && !assistantMessageRow) {
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
    assistantMessage: assistantMessageRow
      ? mapMessage(assistantMessageRow)
      : null,
  };
}

function buildChatContext(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
  userMessageRef: { row: MessageRow },
  onGenerationLinked: CreateAssistantChatContext["onGenerationLinked"],
  referenceCandidates: CreateAssistantChatContext["referenceCandidates"],
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
    referenceCandidates,
  };
}

/**
 * NDJSON assistant turn events.
 *
 * Architecture: all slow work (agent tool loop, DB writes, title generation)
 * runs server-side to completion BEFORE any text is streamed to the client.
 * The HTTP stream is open for under ~2 s in all cases, which prevents
 * ERR_INCOMPLETE_CHUNKED_ENCODING from proxy / load-balancer timeouts.
 *
 * Flow:
 *   meta  →  [generation?]  →  text chunks (fast)  →  done
 *
 * Generation status is polled independently by the client via React Query.
 */
export async function* iterateProjectAssistantMessageStream(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
): AsyncGenerator<AssistantMessageStreamEvent> {
  try {
    // ── 1. Persist user message ──────────────────────────────────────────────
    const persisted = await persistProjectAssistantUserMessage(
      actorUserId,
      workspaceId,
      projectId,
      body,
    );

    let { threadRow, userMessageRow } = persisted;
    const userMessageRef = { row: userMessageRow };

    // Optional bypass: caller already decided to enqueue a generation directly.
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

    // ── 2. Emit meta so client knows the threadId immediately ────────────────
    yield {
      type: "meta",
      thread: mapThread(threadRow),
      userMessage: mapMessage(userMessageRow),
    };

    // ── 3. Run the full agent turn synchronously (all tool calls complete) ───
    //    runCreateChatTurn handles tool loops including startGeneration.
    //    Any generation is enqueued to Inngest before we stream a single byte.
    const history = await loadCreateChatHistory(threadRow.id, {
      id: userMessageRow.id,
      createdAt: userMessageRow.createdAt,
    });
    const referenceCandidates = await loadCreateReferenceCandidates({
      workspaceId,
      projectId,
      threadId: threadRow.id,
      currentReferenceAssetIds: body.referenceAssetIds,
      beforeMessage: {
        id: userMessageRow.id,
        createdAt: userMessageRow.createdAt,
      },
    });

    let generationLinkedUserMessage: ReturnType<typeof mapMessage> | null =
      null;

    const chatContext = buildChatContext(
      actorUserId,
      workspaceId,
      projectId,
      body,
      userMessageRef,
      (userMessage) => {
        generationLinkedUserMessage = userMessage;
      },
      referenceCandidates,
    );

    const turnInput = {
      chatModelId: body.chatModelId,
      workspaceId,
      projectId,
      threadId: threadRow.id,
      userMessageId: userMessageRef.row.id,
      threadSummary: threadRow.summary,
      history,
      userPrompt: body.prompt,
      referenceAssetIds: body.referenceAssetIds,
      referenceCandidates,
    };

    // Full agent turn — tool calls (searchAssets, startGeneration, etc.) run
    // to completion here. No HTTP bytes written to the client yet.
    const assistantContent = await generateCreateAssistantReply(
      turnInput,
      chatContext,
    );

    // ── 4. Emit generation event if startGeneration was called ───────────────
    if (generationLinkedUserMessage) {
      yield { type: "generation", userMessage: generationLinkedUserMessage };
    }

    const generationStarted = generationLinkedUserMessage !== null;

    // ── 5. Stream only conversational / clarification text. Generation turns
    // render through the generation card and intentionally have no assistant ack.
    if (!generationStarted) {
      const chunkSize = 48;
      for (let i = 0; i < assistantContent.length; i += chunkSize) {
        yield { type: "text", delta: assistantContent.slice(i, i + chunkSize) };
      }
    }

    // ── 6. Persist assistant message + optionally update thread title ─────────
    const completed = await completeAssistantTurn({
      threadRow,
      userMessageRow: userMessageRef.row,
      prompt: body.prompt,
      assistantContent: generationStarted ? null : assistantContent,
    });

    yield {
      type: "done",
      thread: completed.thread,
      outcome: generationStarted ? "generation_started" : "assistant_message",
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
  return createHeartbeatNdjsonStream({
    events,
    encode: encodeStreamEvent,
    heartbeatEvent: { type: "ping" },
    heartbeatMs: STREAM_HEARTBEAT_MS,
  });
}
