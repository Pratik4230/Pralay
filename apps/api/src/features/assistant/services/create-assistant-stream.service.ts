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
  | { type: "error"; message: string };

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
  write: (event: AssistantMessageStreamEvent) => void,
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
    onGenerationLinked: (userMessage) => {
      write({ type: "generation", userMessage });
    },
  };
}

export function createProjectAssistantMessageStream(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBody,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const write = (event: AssistantMessageStreamEvent) => {
        controller.enqueue(encodeStreamEvent(event));
      };

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

        write({
          type: "meta",
          thread: mapThread(threadRow),
          userMessage: mapMessage(userMessageRow),
        });

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
          write,
        );

        const turnInput = {
          chatModelId: body.chatModelId,
          threadSummary: threadRow.summary,
          history,
          userPrompt: body.prompt,
          referenceAssetIds: body.referenceAssetIds,
        };

        let assistantContent = "";
        for await (const delta of streamCreateAssistantReply(
          turnInput,
          chatContext,
        )) {
          assistantContent += delta;
          write({ type: "text", delta });
        }

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

        write({
          type: "done",
          thread: completed.thread,
          assistantMessage: completed.assistantMessage,
        });
        controller.close();
      } catch (error) {
        if (error instanceof AssistantThreadNotFoundError) {
          write({ type: "error", message: "Thread not found" });
        } else {
          console.error("[create-assistant] stream failed", error);
          write({
            type: "error",
            message: "Something went wrong while streaming the reply.",
          });
        }
        controller.close();
      }
    },
  });
}
