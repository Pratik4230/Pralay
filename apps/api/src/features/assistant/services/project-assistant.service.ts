import { and, desc, eq, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import type {
  AssistantMessageGenerationSummary,
  CreateProjectAssistantThreadBody,
  ListProjectAssistantMessagesQuery,
  SendProjectAssistantMessageBody,
} from "@repo/validators";

import {
  ProjectNotFoundError,
  getWorkspaceProject,
} from "../../projects/services/workspace-projects.service.js";
import {
  requireWorkspaceMembership,
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";
import {
  AssistantMessageListCursorError,
  decodeAssistantMessageListCursor,
  encodeAssistantMessageListCursor,
} from "./assistant-message-list-cursor.js";
import {
  loadCreateChatHistory,
  loadCreateReferenceCandidates,
} from "./create-chat-context.js";
import { completeAssistantTurn } from "./create-assistant-stream.service.js";
import { inngest } from "../../../inngest/client.js";
import { generateCreateAssistantReply } from "./create-assistant-ai.service.js";
import {
  attachGenerationToAssistantUserMessage,
  loadAssistantMessageGenerationSummaries,
  StorageNotConfiguredError,
} from "../../generations/services/project-generations.service.js";

export class AssistantThreadNotFoundError extends Error {
  constructor(message = "Thread not found") {
    super(message);
    this.name = "AssistantThreadNotFoundError";
  }
}

type ThreadRow = typeof assistantThreads.$inferSelect;
type MessageRow = typeof assistantMessages.$inferSelect;

export type { ThreadRow, MessageRow };

export function mapThread(row: ThreadRow) {
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

export function mapMessage(
  row: MessageRow,
  generation?: AssistantMessageGenerationSummary | null,
) {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    content: row.content,
    referenceAssetIds: row.referenceAssetIds,
    generationId: row.generationId,
    ...(generation !== undefined ? { generation } : {}),
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

/**
 * Permanently removes a Create conversation and its messages. Generation
 * records and generated project assets are intentionally left intact.
 */
export async function deleteProjectAssistantThread(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  threadId: string,
) {
  await assertProjectInWorkspace(actorUserId, workspaceId, projectId);

  const thread = await getThreadForProject(workspaceId, projectId, threadId);
  if (!thread) {
    throw new AssistantThreadNotFoundError();
  }

  const membership = await requireWorkspaceMembership(actorUserId, workspaceId);
  const canDelete =
    thread.createdBy === actorUserId ||
    membership.role === "owner" ||
    membership.role === "admin";
  if (!canDelete) {
    throw new WorkspaceForbiddenError();
  }

  await db.delete(assistantThreads).where(eq(assistantThreads.id, thread.id));

  return { success: true as const };
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

  const generationIds = chronological
    .map((row) => row.generationId)
    .filter((id): id is string => Boolean(id));

  const generationById =
    await loadAssistantMessageGenerationSummaries(generationIds);

  let nextCursor: string | null = null;
  if (hasMore) {
    const oldestInPage = page[page.length - 1]!;
    nextCursor = encodeAssistantMessageListCursor({
      createdAt: oldestInPage.createdAt,
      id: oldestInPage.id,
    });
  }

  return {
    messages: chronological.map((row) =>
      mapMessage(
        row,
        row.generationId
          ? (generationById.get(row.generationId) ?? null)
          : null,
      ),
    ),
    nextCursor,
  };
}

export async function persistProjectAssistantUserMessage(
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

    return { threadRow, userMessageRow };
  });
}

export async function sendProjectAssistantMessage(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: SendProjectAssistantMessageBody,
) {
  const { threadRow, userMessageRow: persistedUserMessage } =
    await persistProjectAssistantUserMessage(
      actorUserId,
      workspaceId,
      projectId,
      input,
    );

  let userMessageRow = persistedUserMessage;

  if (input.enqueueGeneration) {
    try {
      const linked = await attachGenerationToAssistantUserMessage({
        actorUserId,
        workspaceId,
        projectId,
        messageId: userMessageRow.id,
        prompt: input.prompt,
        inputAssetIds: input.referenceAssetIds,
        aspectRatio: input.aspectRatio,
      });
      userMessageRow = linked.userMessageRow;
    } catch (error) {
      if (!(error instanceof StorageNotConfiguredError)) {
        throw error;
      }
    }
  }

  const history = await loadCreateChatHistory(threadRow.id, {
    id: userMessageRow.id,
    createdAt: userMessageRow.createdAt,
  });
  const referenceCandidates = await loadCreateReferenceCandidates({
    workspaceId,
    projectId,
    threadId: threadRow.id,
    currentReferenceAssetIds: input.referenceAssetIds,
    beforeMessage: {
      id: userMessageRow.id,
      createdAt: userMessageRow.createdAt,
    },
  });

  const userMessageRef = { row: userMessageRow };

  const assistantContent = await generateCreateAssistantReply(
    {
      chatModelId: input.chatModelId,
      workspaceId,
      projectId,
      threadId: threadRow.id,
      userMessageId: userMessageRow.id,
      threadSummary: threadRow.summary,
      history,
      userPrompt: input.prompt,
      referenceAssetIds: input.referenceAssetIds,
      referenceCandidates,
    },
    {
      actorUserId,
      workspaceId,
      projectId,
      body: input,
      getUserMessageRow: () => userMessageRef.row,
      setUserMessageRow: (row) => {
        userMessageRef.row = row;
      },
      referenceCandidates,
    },
  );

  const completed = await completeAssistantTurn({
    threadRow,
    userMessageRow: userMessageRef.row,
    prompt: input.prompt,
    assistantContent: userMessageRef.row.generationId ? null : assistantContent,
  });

  return {
    thread: completed.thread,
    userMessage: mapMessage(userMessageRef.row),
    assistantMessage: completed.assistantMessage,
  };
}

// ---------------------------------------------------------------------------
// Submit + Poll pattern (production)
// ---------------------------------------------------------------------------

const AGENT_ERROR_REPLY =
  "I could not generate a reply right now. Please try again in a moment.";

/**
 * Runs the full agent turn in the background after the user message has been
 * persisted. On success: persists assistant reply + optional thread title.
 * On failure: persists an error assistant message so the client always gets
 * a response via polling.
 *
 * This function never throws — all errors are caught and handled.
 */
export async function processProjectAssistantTurn(params: {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  threadRow: ThreadRow;
  userMessageRow: MessageRow;
  body: SendProjectAssistantMessageBody;
}): Promise<void> {
  const { actorUserId, workspaceId, projectId, threadRow, body } = params;
  const userMessageRef = { row: params.userMessageRow };

  try {
    const history = await loadCreateChatHistory(threadRow.id, {
      id: userMessageRef.row.id,
      createdAt: userMessageRef.row.createdAt,
    });
    const referenceCandidates = await loadCreateReferenceCandidates({
      workspaceId,
      projectId,
      threadId: threadRow.id,
      currentReferenceAssetIds: body.referenceAssetIds,
      beforeMessage: {
        id: userMessageRef.row.id,
        createdAt: userMessageRef.row.createdAt,
      },
    });

    const assistantContent = await generateCreateAssistantReply(
      {
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
      },
      {
        actorUserId,
        workspaceId,
        projectId,
        body,
        getUserMessageRow: () => userMessageRef.row,
        setUserMessageRow: (row) => {
          userMessageRef.row = row;
        },
        referenceCandidates,
      },
    );

    await completeAssistantTurn({
      threadRow,
      userMessageRow: userMessageRef.row,
      prompt: body.prompt,
      assistantContent: userMessageRef.row.generationId
        ? null
        : assistantContent,
    });
  } catch (error) {
    console.error("[create-assistant] background agent turn failed", error);

    // Persist a visible error message so the client sees something via polling.
    try {
      await db.insert(assistantMessages).values({
        threadId: threadRow.id,
        role: "assistant",
        content: AGENT_ERROR_REPLY,
        referenceAssetIds: [],
      });
      await db
        .update(assistantThreads)
        .set({ updatedAt: new Date() })
        .where(eq(assistantThreads.id, threadRow.id));
    } catch (dbError) {
      console.error(
        "[create-assistant] failed to persist error reply",
        dbError,
      );
    }
  }
}

/**
 * Async submit: persists the user message, fires the agent turn in the
 * background, and returns immediately. The assistant reply appears later
 * and is picked up by the client via polling GET /messages.
 */
export async function submitProjectAssistantMessage(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: SendProjectAssistantMessageBody,
) {
  const { threadRow, userMessageRow: persistedUserMessage } =
    await persistProjectAssistantUserMessage(
      actorUserId,
      workspaceId,
      projectId,
      input,
    );

  let userMessageRow = persistedUserMessage;

  if (input.enqueueGeneration) {
    try {
      const linked = await attachGenerationToAssistantUserMessage({
        actorUserId,
        workspaceId,
        projectId,
        messageId: userMessageRow.id,
        prompt: input.prompt,
        inputAssetIds: input.referenceAssetIds,
        aspectRatio: input.aspectRatio,
      });
      userMessageRow = linked.userMessageRow;
    } catch (error) {
      if (!(error instanceof StorageNotConfiguredError)) {
        throw error;
      }
    }
  }

  await inngest.send({
    name: "pralay/assistant-turn.requested",
    data: {
      actorUserId,
      workspaceId,
      projectId,
      threadId: threadRow.id,
      userMessageId: userMessageRow.id,
      body: input,
    },
  });

  return {
    thread: mapThread(threadRow),
    userMessage: mapMessage(userMessageRow),
  };
}

export { AssistantMessageListCursorError };
