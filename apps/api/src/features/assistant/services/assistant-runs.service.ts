import { and, asc, eq, gt, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  assistantRunEvents,
  assistantRuns,
  assistantThreads,
  type AssistantRunEventType,
} from "@repo/db/schema";
import type { SendProjectAssistantMessageBody } from "@repo/validators";

import {
  ProjectNotFoundError,
  getWorkspaceProject,
} from "../../projects/services/workspace-projects.service.js";

type AssistantRunRow = typeof assistantRuns.$inferSelect;
type AssistantRunEventRow = typeof assistantRunEvents.$inferSelect;

export class AssistantRunNotFoundError extends Error {
  constructor(message = "Assistant run not found") {
    super(message);
    this.name = "AssistantRunNotFoundError";
  }
}

export class AssistantRunConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantRunConflictError";
  }
}

export function mapAssistantRun(row: AssistantRunRow) {
  return {
    id: row.id,
    threadId: row.threadId,
    userMessageId: row.userMessageId,
    assistantMessageId: row.assistantMessageId,
    status: row.status,
    outcome: row.outcome,
    errorMessage: row.errorMessage,
    attemptCount: row.attemptCount,
    cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapAssistantRunEvent(row: AssistantRunEventRow) {
  return {
    id: row.id,
    runId: row.runId,
    sequence: row.sequence,
    type: row.type,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function appendAssistantRunEvent(
  runId: string,
  type: AssistantRunEventType,
  payload: Record<string, unknown> = {},
) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .update(assistantRuns)
      .set({
        nextEventSequence: sql`${assistantRuns.nextEventSequence} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(assistantRuns.id, runId))
      .returning({ nextEventSequence: assistantRuns.nextEventSequence });

    if (!run) throw new AssistantRunNotFoundError();

    const [event] = await tx
      .insert(assistantRunEvents)
      .values({
        runId,
        sequence: run.nextEventSequence - 1,
        type,
        payload,
      })
      .returning();

    if (!event) throw new Error("Failed to append assistant run event");
    return event;
  });
}

export async function getAssistantRunById(runId: string) {
  const [row] = await db
    .select()
    .from(assistantRuns)
    .where(eq(assistantRuns.id, runId))
    .limit(1);
  return row ?? null;
}

async function requireProjectAssistantRun(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  runId: string,
) {
  await getWorkspaceProject(actorUserId, workspaceId, projectId);

  const [row] = await db
    .select({ run: assistantRuns })
    .from(assistantRuns)
    .innerJoin(
      assistantThreads,
      eq(assistantThreads.id, assistantRuns.threadId),
    )
    .where(
      and(
        eq(assistantRuns.id, runId),
        eq(assistantThreads.workspaceId, workspaceId),
        eq(assistantThreads.projectId, projectId),
      ),
    )
    .limit(1);

  if (!row) throw new AssistantRunNotFoundError();
  return row.run;
}

export async function listProjectAssistantRunEvents(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  runId: string,
  afterSequence: number,
) {
  const run = await requireProjectAssistantRun(
    actorUserId,
    workspaceId,
    projectId,
    runId,
  );
  const events = await db
    .select()
    .from(assistantRunEvents)
    .where(
      and(
        eq(assistantRunEvents.runId, runId),
        gt(assistantRunEvents.sequence, afterSequence),
      ),
    )
    .orderBy(asc(assistantRunEvents.sequence))
    .limit(250);

  return {
    run: mapAssistantRun(run),
    events: events.map(mapAssistantRunEvent),
  };
}

export async function startAssistantRunAttempt(runId: string, attempt: number) {
  const now = new Date();
  const [row] = await db
    .update(assistantRuns)
    .set({
      status: "processing",
      errorMessage: null,
      startedAt: now,
      completedAt: null,
      attemptCount: sql`greatest(${assistantRuns.attemptCount}, ${attempt + 1})`,
      updatedAt: now,
    })
    .where(
      and(
        eq(assistantRuns.id, runId),
        sql`${assistantRuns.status} <> 'cancelled'`,
        sql`${assistantRuns.status} <> 'completed'`,
      ),
    )
    .returning();

  if (!row) return null;
  if (attempt > 0) {
    await appendAssistantRunEvent(runId, "reset", { attempt: attempt + 1 });
  }
  await appendAssistantRunEvent(runId, "status", {
    status: "processing",
    attempt: attempt + 1,
  });
  return row;
}

export async function completeAssistantRun(input: {
  runId: string;
  assistantMessageId: string | null;
  outcome: "assistant_message" | "generation_started";
}) {
  const now = new Date();
  const [row] = await db
    .update(assistantRuns)
    .set({
      status: "completed",
      outcome: input.outcome,
      assistantMessageId: input.assistantMessageId,
      completedAt: now,
      updatedAt: now,
      errorMessage: null,
    })
    .where(
      and(
        eq(assistantRuns.id, input.runId),
        sql`${assistantRuns.status} <> 'cancelled'`,
      ),
    )
    .returning();
  if (!row) return null;
  await appendAssistantRunEvent(input.runId, "completed", {
    outcome: input.outcome,
    assistantMessageId: input.assistantMessageId,
  });
  return row;
}

export async function failAssistantRun(runId: string, message: string) {
  const now = new Date();
  const [row] = await db
    .update(assistantRuns)
    .set({
      status: "failed",
      errorMessage: message,
      completedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(assistantRuns.id, runId),
        sql`${assistantRuns.status} <> 'completed'`,
        sql`${assistantRuns.status} <> 'cancelled'`,
      ),
    )
    .returning();
  if (!row) return null;
  await appendAssistantRunEvent(runId, "failed", { message });
  return row;
}

export async function cancelProjectAssistantRun(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  runId: string,
) {
  const current = await requireProjectAssistantRun(
    actorUserId,
    workspaceId,
    projectId,
    runId,
  );
  if (current.status === "completed" || current.status === "failed") {
    throw new AssistantRunConflictError("This assistant run has already ended");
  }
  if (current.status === "cancelled") return current;

  const now = new Date();
  const [row] = await db
    .update(assistantRuns)
    .set({
      status: "cancelled",
      cancelRequestedAt: now,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(assistantRuns.id, runId))
    .returning();
  if (!row) throw new AssistantRunNotFoundError();
  await appendAssistantRunEvent(runId, "cancelled", {});
  return row;
}

export async function retryProjectAssistantRun(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  runId: string,
) {
  const current = await requireProjectAssistantRun(
    actorUserId,
    workspaceId,
    projectId,
    runId,
  );
  if (current.status !== "failed" && current.status !== "cancelled") {
    throw new AssistantRunConflictError(
      "Only failed or cancelled assistant runs can be retried",
    );
  }

  const [row] = await db
    .update(assistantRuns)
    .set({
      status: "queued",
      outcome: null,
      assistantMessageId: null,
      errorMessage: null,
      cancelRequestedAt: null,
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(assistantRuns.id, runId))
    .returning();
  if (!row) throw new AssistantRunNotFoundError();
  await appendAssistantRunEvent(runId, "reset", { manualRetry: true });
  await appendAssistantRunEvent(runId, "status", { status: "queued" });
  return row;
}

export function assistantRunInput(row: AssistantRunRow) {
  return row.input as SendProjectAssistantMessageBody;
}

export { ProjectNotFoundError };
