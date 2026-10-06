import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assets, assistantMessages, generations } from "@repo/db/schema";
import type {
  CreateChatHistoryMessage,
  CreateChatReferenceCandidate,
} from "@repo/agents";
import { collectCreateReferenceCandidateSeeds } from "./create-reference-candidates.js";

const DEFAULT_HISTORY_LIMIT = 16;
const MAX_REFERENCE_CANDIDATES = 24;

function isLegacyGenerationAcknowledgement(content: string) {
  return /^\s*(queued\b|generation (?:queued|started)\b)/i.test(content);
}

export async function loadCreateChatHistory(
  threadId: string,
  beforeMessage: { id: string; createdAt: Date },
  limit = DEFAULT_HISTORY_LIMIT,
): Promise<CreateChatHistoryMessage[]> {
  const rows = await db
    .select({
      role: assistantMessages.role,
      content: assistantMessages.content,
      generationId: assistantMessages.generationId,
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

  const chronological = rows.reverse();
  const history: CreateChatHistoryMessage[] = [];

  for (let index = 0; index < chronological.length; index += 1) {
    const row = chronological[index]!;
    if (row.role !== "user" && row.role !== "assistant") continue;

    const previous = chronological[index - 1];
    if (
      row.role === "assistant" &&
      ((previous?.role === "user" && previous.generationId) ||
        isLegacyGenerationAcknowledgement(row.content))
    ) {
      continue;
    }

    history.push({ role: row.role, content: row.content });
  }

  return history;
}

/** Metadata-only reference candidates from the current message and recent thread. */
export async function loadCreateReferenceCandidates(input: {
  workspaceId: string;
  projectId: string;
  threadId: string;
  currentReferenceAssetIds: string[];
  beforeMessage: { id: string; createdAt: Date };
}): Promise<CreateChatReferenceCandidate[]> {
  const recentMessages = await db
    .select({
      id: assistantMessages.id,
      referenceAssetIds: assistantMessages.referenceAssetIds,
      generationId: assistantMessages.generationId,
      createdAt: assistantMessages.createdAt,
    })
    .from(assistantMessages)
    .where(
      and(
        eq(assistantMessages.threadId, input.threadId),
        lt(assistantMessages.createdAt, input.beforeMessage.createdAt),
      ),
    )
    .orderBy(desc(assistantMessages.createdAt))
    .limit(DEFAULT_HISTORY_LIMIT);

  const generationIds = recentMessages
    .map((message) => message.generationId)
    .filter((id): id is string => Boolean(id));
  const generationRows = generationIds.length
    ? await db
        .select({
          id: generations.id,
          status: generations.status,
          outputAssetIds: generations.outputAssetIds,
        })
        .from(generations)
        .where(
          and(
            inArray(generations.id, generationIds),
            eq(generations.workspaceId, input.workspaceId),
            eq(generations.projectId, input.projectId),
            isNull(generations.deletedAt),
          ),
        )
    : [];
  const uniqueSeeds = collectCreateReferenceCandidateSeeds({
    currentMessageId: input.beforeMessage.id,
    currentReferenceAssetIds: input.currentReferenceAssetIds,
    recentMessages,
    generationRows,
    limit: MAX_REFERENCE_CANDIDATES,
  });
  if (uniqueSeeds.length === 0) return [];

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      category: assets.category,
      tags: assets.tags,
      mimeType: assets.mimeType,
      width: assets.width,
      height: assets.height,
      primaryProjectId: assets.primaryProjectId,
      description: assets.description,
    })
    .from(assets)
    .where(
      and(
        inArray(
          assets.id,
          uniqueSeeds.map((seed) => seed.assetId),
        ),
        eq(assets.workspaceId, input.workspaceId),
        isNull(assets.deletedAt),
        or(
          isNull(assets.primaryProjectId),
          eq(assets.primaryProjectId, input.projectId),
        ),
      ),
    );
  const rowById = new Map(rows.map((row) => [row.id, row]));

  return uniqueSeeds.flatMap((seed) => {
    const row = rowById.get(seed.assetId);
    if (!row || !row.mimeType.startsWith("image/")) return [];
    return [
      {
        id: row.id,
        name: row.name,
        category: row.category,
        tags: row.tags,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        scope: row.primaryProjectId
          ? ("project" as const)
          : ("workspace" as const),
        description: row.description,
        provenance: seed.provenance,
        sourceMessageId: seed.sourceMessageId,
        sourceGenerationId: seed.sourceGenerationId,
        isGenerated: row.type === "generated" || row.type === "edited",
      },
    ];
  });
}
