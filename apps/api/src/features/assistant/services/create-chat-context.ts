import { and, desc, eq, lt } from "drizzle-orm";

import { db } from "@repo/db";
import { assistantMessages } from "@repo/db/schema";
import type { CreateChatHistoryMessage } from "@repo/agents";

const DEFAULT_HISTORY_LIMIT = 16;

export async function loadCreateChatHistory(
  threadId: string,
  beforeMessage: { id: string; createdAt: Date },
  limit = DEFAULT_HISTORY_LIMIT,
): Promise<CreateChatHistoryMessage[]> {
  const rows = await db
    .select({
      role: assistantMessages.role,
      content: assistantMessages.content,
      createdAt: assistantMessages.createdAt,
    })
    .from(assistantMessages)
    .where(
      and(
        eq(assistantMessages.threadId, threadId),
        lt(assistantMessages.createdAt, beforeMessage.createdAt),
      ),
    )
    // Fetch the newest bounded context first, then return it chronologically.
    .orderBy(desc(assistantMessages.createdAt))
    .limit(limit);

  return rows
    .reverse()
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));
}
