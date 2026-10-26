import { and, eq, gt } from "drizzle-orm";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import { createProjectMessageBodySchema } from "@repo/validators/create";

import { inngest } from "../client.js";
import { processProjectAssistantTurn } from "../../features/assistant/services/project-assistant.service.js";
import {
  assistantRunInput,
  completeAssistantRun,
  failAssistantRun,
  getAssistantRunById,
  startAssistantRunAttempt,
} from "../../features/assistant/services/assistant-runs.service.js";

const ASSISTANT_RUN_FAILED_MESSAGE =
  "I could not complete this request. You can retry it.";

export const runAssistantTurn = inngest.createFunction(
  {
    id: "run-assistant-turn",
    triggers: [{ event: "pralay/assistant-turn.requested" }],
    retries: 3,
    singleton: { key: "event.data.runId", mode: "skip" },
    cancelOn: [
      {
        event: "pralay/assistant-turn.cancelled",
        if: "async.data.runId == event.data.runId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const originalEvent = event.data.event as { data?: { runId?: unknown } };
      const runId = originalEvent.data?.runId;
      if (typeof runId !== "string" || runId.length === 0) return;
      await step.run("mark-assistant-run-failed", () =>
        failAssistantRun(runId, ASSISTANT_RUN_FAILED_MESSAGE),
      );
    },
  },
  async ({ event, step, attempt }) => {
    const data = event.data;
    const run = await getAssistantRunById(data.runId);
    if (!run) throw new Error("Assistant run no longer exists");
    const body = createProjectMessageBodySchema.parse(
      data.body ?? assistantRunInput(run),
    );

    return step.run("persist-assistant-turn", async () => {
      const started = await startAssistantRunAttempt(run.id, attempt);
      if (!started) return { status: "already_terminal" as const };

      const [thread] = await db
        .select()
        .from(assistantThreads)
        .where(
          and(
            eq(assistantThreads.id, data.threadId),
            eq(assistantThreads.workspaceId, data.workspaceId),
            eq(assistantThreads.projectId, data.projectId),
          ),
        )
        .limit(1);
      const [userMessage] = await db
        .select()
        .from(assistantMessages)
        .where(
          and(
            eq(assistantMessages.id, data.userMessageId),
            eq(assistantMessages.threadId, data.threadId),
            eq(assistantMessages.role, "user"),
          ),
        )
        .limit(1);

      if (!thread || !userMessage) {
        throw new Error("Assistant turn message or thread no longer exists");
      }

      const existingReply = await db
        .select({ id: assistantMessages.id })
        .from(assistantMessages)
        .where(
          and(
            eq(assistantMessages.threadId, data.threadId),
            eq(assistantMessages.role, "assistant"),
            gt(assistantMessages.createdAt, userMessage.createdAt),
          ),
        )
        .limit(1);

      // Inngest retries replay this event. A reply after this message means
      // its turn completed already, so do not create a duplicate reply.
      if (existingReply.length > 0) {
        await completeAssistantRun({
          runId: run.id,
          assistantMessageId: existingReply[0]!.id,
          outcome: "assistant_message",
        });
        return { status: "already_completed" as const };
      }

      if (userMessage.generationId) {
        await completeAssistantRun({
          runId: run.id,
          assistantMessageId: null,
          outcome: "generation_started",
        });
        return { status: "already_completed" as const };
      }

      await processProjectAssistantTurn({
        actorUserId: data.actorUserId,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        threadRow: thread,
        userMessageRow: userMessage,
        body,
        runId: run.id,
      });
      return { status: "completed" as const };
    });
  },
);
