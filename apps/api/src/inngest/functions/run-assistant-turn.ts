import { and, eq, gt } from "drizzle-orm";

import { db } from "@repo/db";
import { assistantMessages, assistantThreads } from "@repo/db/schema";
import { createProjectMessageBodySchema } from "@repo/validators/create";

import { inngest } from "../client.js";
import { processProjectAssistantTurn } from "../../features/assistant/services/project-assistant.service.js";

export const runAssistantTurn = inngest.createFunction(
  {
    id: "run-assistant-turn",
    triggers: [{ event: "pralay/assistant-turn.requested" }],
  },
  async ({ event, step }) => {
    const data = event.data;
    const body = createProjectMessageBodySchema.parse(data.body);

    return step.run("persist-assistant-turn", async () => {
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
        return { status: "already_completed" as const };
      }

      await processProjectAssistantTurn({
        actorUserId: data.actorUserId,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        threadRow: thread,
        userMessageRow: userMessage,
        body,
      });
      return { status: "completed" as const };
    });
  },
);
