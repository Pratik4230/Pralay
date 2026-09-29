import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@repo/db";
import { assets } from "@repo/db/schema";

import { normalizeWorkspaceAssetDisplayName } from "@repo/validators/asset";
import { getWorkspaceProject } from "../../projects/services/workspace-projects.service.js";
import { requireWorkspaceMembership } from "../../workspace/services/workspace-access.service.js";

export type CreateAssetSearchConfidence = "high" | "medium" | "low";

export type CreateAssetSearchHit = {
  id: string;
  name: string;
  mimeType: string;
  s3Key: string;
  scope: "workspace" | "project";
  score: number;
  confidence: CreateAssetSearchConfidence;
  matchedOn: "name_exact" | "name_prefix" | "name_contains" | "tag";
};

const HIGH_SCORE = 0.88;
const MEDIUM_SCORE = 0.65;

function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function scoreHit(
  name: string,
  tags: string[],
  query: string,
): { score: number; matchedOn: CreateAssetSearchHit["matchedOn"] } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const normalizedName = name.trim().toLowerCase();
  const normalizedQuery = normalizeWorkspaceAssetDisplayName(query);

  if (normalizedName === q || (normalizedQuery && normalizedName === normalizedQuery)) {
    return { score: 1, matchedOn: "name_exact" };
  }
  if (normalizedName.startsWith(q) || (normalizedQuery && normalizedName.startsWith(normalizedQuery))) {
    return { score: 0.92, matchedOn: "name_prefix" };
  }
  if (normalizedName.includes(q) || (normalizedQuery && normalizedName.includes(normalizedQuery))) {
    return { score: 0.78, matchedOn: "name_contains" };
  }

  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (!t) continue;
    if (t === q || t.startsWith(q) || t.includes(q)) {
      return { score: 0.72, matchedOn: "tag" };
    }
  }

  return null;
}

function toConfidence(score: number): CreateAssetSearchConfidence {
  if (score >= HIGH_SCORE) return "high";
  if (score >= MEDIUM_SCORE) return "medium";
  return "low";
}

/** Fuzzy library search for the Create agent (workspace + project uploads). */
export async function searchWorkspaceAssetsForCreateAgent(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  query: string,
  limit = 8,
): Promise<{ query: string; items: CreateAssetSearchHit[] }> {
  await requireWorkspaceMembership(actorUserId, workspaceId);
  await getWorkspaceProject(actorUserId, workspaceId, projectId);

  const q = query.trim();
  if (q.length === 0) {
    return { query: q, items: [] };
  }

  const pattern = `%${escapeIlike(q)}%`;
  const prefix = `${escapeIlike(q)}%`;

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      mimeType: assets.mimeType,
      s3Key: assets.s3Key,
      primaryProjectId: assets.primaryProjectId,
      tags: assets.tags,
    })
    .from(assets)
    .where(
      and(
        eq(assets.workspaceId, workspaceId),
        eq(assets.scope, "workspace"),
        eq(assets.type, "upload"),
        isNull(assets.deletedAt),
        or(
          isNull(assets.primaryProjectId),
          eq(assets.primaryProjectId, projectId),
        )!,
        or(
          ilike(assets.name, prefix),
          ilike(assets.name, pattern),
          sql`array_to_string(${assets.tags}, ' ') ilike ${pattern}`,
        )!,
      ),
    )
    .orderBy(asc(assets.name), asc(assets.id))
    .limit(Math.min(limit * 3, 40));

  const scored: CreateAssetSearchHit[] = [];

  for (const row of rows) {
    const match = scoreHit(row.name, row.tags ?? [], q);
    if (!match) continue;

    scored.push({
      id: row.id,
      name: row.name,
      mimeType: row.mimeType,
      s3Key: row.s3Key,
      scope: row.primaryProjectId ? "project" : "workspace",
      score: match.score,
      confidence: toConfidence(match.score),
      matchedOn: match.matchedOn,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    query: q,
    items: scored.slice(0, limit),
  };
}
