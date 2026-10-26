import { and, desc, eq, inArray, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import {
  assistantMessages,
  assistantRunEvents,
  assistantRuns,
  assistantThreads,
} from "@repo/db/schema";
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
import {
  generateCreateAssistantReply,
  runCreateAssistantReply,
} from "./create-assistant-ai.service.js";
import {
  appendAssistantRunEvent,
  completeAssistantRun,
  failAssistantRun,
  getAssistantRunById,
  mapAssistantRun,
} from "./assistant-runs.service.js";
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
  run?: ReturnType<typeof mapAssistantRun> | null,
) {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    content: row.content,
    referenceAssetIds: row.referenceAssetIds,
    generationId: row.generationId,
    ...(generation !== undefined ? { generation } : {}),
    ...(run !== undefined ? { run } : {}),
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
  const userMessageIds = chronological
    .filter((row) => row.role === "user")
    .map((row) => row.id);
  const runRows =
    userMessageIds.length > 0
      ? await db
          .select()
          .from(assistantRuns)
          .where(inArray(assistantRuns.userMessageId, userMessageIds))
      : [];
  const runByUserMessageId = new Map(
    runRows.map((row) => [row.userMessageId, mapAssistantRun(row)]),
  );

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
        row.role === "user" ? (runByUserMessageId.get(row.id) ?? null) : null,
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
  options?: { createRun?: boolean },
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

    const runRow = options?.createRun
      ? (
          await tx
            .insert(assistantRuns)
            .values({
              threadId: threadRow.id,
              userMessageId: userMessageRow.id,
              input,
              nextEventSequence: 2,
            })
            .returning()
        )[0]
      : null;
    if (options?.createRun && !runRow) {
      throw new Error("Failed to create assistant run");
    }
    if (runRow) {
      await tx.insert(assistantRunEvents).values({
        runId: runRow.id,
        sequence: 1,
        type: "status",
        payload: { status: "queued" },
      });
    }

    return { threadRow, userMessageRow, runRow };
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

const TOOL_PROGRESS: Record<string, string> = {
  search_assets: "Searching your assets",
  inspect_assets: "Inspecting reference assets",
  web_search: "Searching the web",
  start_generation: "Preparing image generation",
  get_generation_status: "Checking generation status",
};

/**
 * Runs the full agent turn in the background after the user message has been
 * persisted. On success: persists assistant reply + optional thread title.
 * On failure: persists an error assistant message so the client always gets
 * a response via polling.
 *
 * Provider failures are allowed to throw so Inngest can retry the turn.
 */
export async function processProjectAssistantTurn(params: {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  threadRow: ThreadRow;
  userMessageRow: MessageRow;
  body: SendProjectAssistantMessageBody;
  runId: string;
}): Promise<void> {
  const { actorUserId, workspaceId, projectId, threadRow, body, runId } =
    params;
  const userMessageRef = { row: params.userMessageRow };

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

  let pendingText = "";
  const flushText = async () => {
    if (!pendingText) return;
    const delta = pendingText;
    pendingText = "";
    await appendAssistantRunEvent(runId, "text_delta", { delta });
  };
  const assertRunActive = async () => {
    const run = await getAssistantRunById(runId);
    if (!run || run.status === "cancelled") {
      throw new Error("Assistant run was cancelled");
    }
  };

  const assistantContent = await runCreateAssistantReply(
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
      events: {
        onModelStart: async (iteration) => {
          await assertRunActive();
          await flushText();
          if (iteration > 0) {
            await appendAssistantRunEvent(runId, "reset", { iteration });
          }
          await appendAssistantRunEvent(runId, "progress", {
            label: iteration === 0 ? "Thinking" : "Preparing the response",
          });
        },
        onTextDelta: async (delta) => {
          pendingText += delta;
          if (pendingText.length >= 48 || pendingText.includes("\n")) {
            await flushText();
          }
        },
        onToolStart: async (name) => {
          await assertRunActive();
          await flushText();
          await appendAssistantRunEvent(runId, "progress", {
            label: TOOL_PROGRESS[name] ?? "Using a tool",
            tool: name,
          });
        },
      },
    },
  );
  await flushText();
  await assertRunActive();

  if (userMessageRef.row.generationId) {
    await appendAssistantRunEvent(runId, "generation", {
      generationId: userMessageRef.row.generationId,
      userMessage: mapMessage(userMessageRef.row),
    });
  }

  const completed = await completeAssistantTurn({
    threadRow,
    userMessageRow: userMessageRef.row,
    prompt: body.prompt,
    assistantContent: userMessageRef.row.generationId ? null : assistantContent,
  });
  await completeAssistantRun({
    runId,
    assistantMessageId: completed.assistantMessage?.id ?? null,
    outcome: userMessageRef.row.generationId
      ? "generation_started"
      : "assistant_message",
  });
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
  const {
    threadRow,
    userMessageRow: persistedUserMessage,
    runRow,
  } = await persistProjectAssistantUserMessage(
    actorUserId,
    workspaceId,
    projectId,
    input,
    { createRun: true },
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

  if (!runRow) throw new Error("Failed to create assistant run");

  try {
    await inngest.send({
      name: "pralay/assistant-turn.requested",
      data: {
        actorUserId,
        workspaceId,
        projectId,
        threadId: threadRow.id,
        userMessageId: userMessageRow.id,
        runId: runRow.id,
        body: input,
      },
    });
  } catch (error) {
    console.error("[create-assistant] failed to enqueue assistant run", error);
    const failed = await failAssistantRun(
      runRow.id,
      "The assistant could not start this request. You can retry it.",
    );
    if (failed) Object.assign(runRow, failed);
  }

  return {
    thread: mapThread(threadRow),
    userMessage: mapMessage(userMessageRow),
    run: mapAssistantRun(runRow),
  };
}

export { AssistantMessageListCursorError };
