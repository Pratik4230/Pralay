import { and, desc, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import type {
  CreateProjectAssistantThreadBody,
  ListProjectAssistantMessagesQuery,
  SendProjectAssistantMessageBody,
} from "@repo/validators";

import {
  ProjectNotFoundError,
  getWorkspaceProject,
} from "../../projects/services/workspace-projects.service.js";
import { WorkspaceAccessError } from "../../workspace/services/workspace-access.service.js";
import {
  AssistantMessageListCursorError,
  decodeAssistantMessageListCursor,
  encodeAssistantMessageListCursor,
} from "./assistant-message-list-cursor.js";

const PLACEHOLDER_ASSISTANT_REPLY =
  "Thanks for your message. The Create assistant is not connected yet, but your prompt was saved.";

export class AssistantThreadNotFoundError extends Error {
  constructor(message = "Thread not found") {
    super(message);
    this.name = "AssistantThreadNotFoundError";
  }
}

type ThreadRow = typeof assistantThreads.$inferSelect;
type MessageRow = typeof assistantMessages.$inferSelect;

function mapThread(row: ThreadRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    createdBy: row.createdBy,
    title: row.title,
    titleAuto: row.titleAuto,
    summary: row.summary,
    summaryThroughMessageId: row.summaryThroughMessageId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    content: row.content,
    referenceAssetIds: row.referenceAssetIds,
    generationId: row.generationId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertProjectInWorkspace(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  try {
    await getWorkspaceProject(actorUserId, workspaceId, projectId);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      throw error;
    }
    if (error instanceof WorkspaceAccessError) {
      throw error;
    }
    throw error;
  }
}

async function getThreadForProject(
  workspaceId: string,
  projectId: string,
  threadId: string,
) {
  const [row] = await db
    .select()
    .from(assistantThreads)
    .where(
      and(
        eq(assistantThreads.id, threadId),
        eq(assistantThreads.workspaceId, workspaceId),
        eq(assistantThreads.projectId, projectId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listProjectAssistantThreads(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  await assertProjectInWorkspace(actorUserId, workspaceId, projectId);

  const rows = await db
    .select()
    .from(assistantThreads)
    .where(
      and(
        eq(assistantThreads.workspaceId, workspaceId),
        eq(assistantThreads.projectId, projectId),
      ),
    )
    .orderBy(desc(assistantThreads.updatedAt));

  return rows.map(mapThread);
}

export async function createProjectAssistantThread(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: CreateProjectAssistantThreadBody,
) {
  await assertProjectInWorkspace(actorUserId, workspaceId, projectId);

  const [row] = await db
    .insert(assistantThreads)
    .values({
      workspaceId,
      projectId,
      createdBy: actorUserId,
      title: input.title ?? null,
      titleAuto: input.title === undefined,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create assistant thread");
  }

  return mapThread(row);
}

export async function listProjectAssistantMessages(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  threadId: string,
  query: ListProjectAssistantMessagesQuery,
) {
  await assertProjectInWorkspace(actorUserId, workspaceId, projectId);

  const thread = await getThreadForProject(workspaceId, projectId, threadId);
  if (!thread) {
    throw new AssistantThreadNotFoundError();
  }

  const conditions = [eq(assistantMessages.threadId, threadId)];

  if (query.cursor) {
    const cursor = decodeAssistantMessageListCursor(query.cursor);
    conditions.push(
      or(
        lt(assistantMessages.createdAt, cursor.createdAt),
        and(
          eq(assistantMessages.createdAt, cursor.createdAt),
          lt(assistantMessages.id, cursor.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(assistantMessages)
    .where(and(...conditions))
    .orderBy(desc(assistantMessages.createdAt), desc(assistantMessages.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const chronological = [...page].reverse();

  let nextCursor: string | null = null;
  if (hasMore) {
    const oldestInPage = page[page.length - 1]!;
    nextCursor = encodeAssistantMessageListCursor({
      createdAt: oldestInPage.createdAt,
      id: oldestInPage.id,
    });
  }

  return {
    messages: chronological.map(mapMessage),
    nextCursor,
  };
}

export async function sendProjectAssistantMessage(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: SendProjectAssistantMessageBody,
) {
  await assertProjectInWorkspace(actorUserId, workspaceId, projectId);

  return db.transaction(async (tx) => {
    let threadRow: ThreadRow;

    if (input.threadId) {
      const existing = await tx
        .select()
        .from(assistantThreads)
        .where(
          and(
            eq(assistantThreads.id, input.threadId),
            eq(assistantThreads.workspaceId, workspaceId),
            eq(assistantThreads.projectId, projectId),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new AssistantThreadNotFoundError();
      }

      threadRow = existing[0];
    } else {
      const [created] = await tx
        .insert(assistantThreads)
        .values({
          workspaceId,
          projectId,
          createdBy: actorUserId,
          title: null,
          titleAuto: true,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create assistant thread");
      }

      threadRow = created;
    }

    const [userMessageRow] = await tx
      .insert(assistantMessages)
      .values({
        threadId: threadRow.id,
        role: "user",
        content: input.prompt,
        referenceAssetIds: input.referenceAssetIds,
      })
      .returning();

    if (!userMessageRow) {
      throw new Error("Failed to save user message");
    }

    const [assistantMessageRow] = await tx
      .insert(assistantMessages)
      .values({
        threadId: threadRow.id,
        role: "assistant",
        content: PLACEHOLDER_ASSISTANT_REPLY,
        referenceAssetIds: [],
      })
      .returning();

    if (!assistantMessageRow) {
      throw new Error("Failed to save assistant message");
    }

    const now = new Date();
    const [updatedThread] = await tx
      .update(assistantThreads)
      .set({ updatedAt: now })
      .where(eq(assistantThreads.id, threadRow.id))
      .returning();

    return {
      thread: mapThread(updatedThread ?? { ...threadRow, updatedAt: now }),
      userMessage: mapMessage(userMessageRow),
      assistantMessage: mapMessage(assistantMessageRow),
    };
  });
}

export { AssistantMessageListCursorError };
