import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@repo/db";
import {
  assets,
  collections,
  generations,
  projects,
  templates,
} from "@repo/db/schema";
import type { TrashedItem, TrashedItemType } from "@repo/validators";

import {
  permanentlyDeleteWorkspaceAsset,
  restoreWorkspaceAsset,
} from "../../assets/services/workspace-assets.service.js";
import {
  permanentlyDeleteWorkspaceProject,
  restoreWorkspaceProject,
} from "../../projects/services/workspace-projects.service.js";
import {
  requireWorkspaceAdmin,
  requireWorkspaceOwner,
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";
import {
  listTrashedWorkspacesForUser,
  permanentlyDeleteWorkspaceForUser,
  restoreWorkspaceForUser,
} from "../../workspace/services/workspaces.service.js";

export class ItemNotFoundError extends Error {
  constructor(message = "Item not found in trash") {
    super(message);
    this.name = "ItemNotFoundError";
  }
}

export { WorkspaceAccessError, WorkspaceForbiddenError };

function computeDaysRemaining(deletedAt: Date | null): number {
  const d = deletedAt ?? new Date();
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, 29 - diffDays);
}

// ─── Global Workspace Trash ───────────────────────────────────────────────────

export async function getGlobalTrash(userId: string) {
  return listTrashedWorkspacesForUser(userId);
}

export async function restoreGlobalTrashedWorkspace(
  userId: string,
  workspaceId: string,
) {
  return restoreWorkspaceForUser(userId, workspaceId);
}

export async function permanentlyDeleteGlobalTrashedWorkspace(
  userId: string,
  workspaceId: string,
) {
  return permanentlyDeleteWorkspaceForUser(userId, workspaceId);
}

// ─── Workspace Trash (projects, assets, collections, templates, generations) ───

export async function listWorkspaceTrash(
  userId: string,
  workspaceId: string,
): Promise<TrashedItem[]> {
  await requireWorkspaceAdmin(userId, workspaceId);

  const [
    deletedProjects,
    deletedAssets,
    deletedCollections,
    deletedTemplates,
    deletedGenerations,
  ] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        coverKey: projects.coverKey,
        deletedAt: projects.deletedAt,
        deletedBy: projects.deletedBy,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          isNotNull(projects.deletedAt),
        ),
      ),

    db
      .select({
        id: assets.id,
        name: assets.name,
        description: assets.description,
        s3Key: assets.s3Key,
        thumbnailKey: assets.thumbnailKey,
        mimeType: assets.mimeType,
        sizeBytes: assets.sizeBytes,
        deletedAt: assets.deletedAt,
        deletedBy: assets.deletedBy,
      })
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNotNull(assets.deletedAt),
        ),
      ),

    db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        deletedAt: collections.deletedAt,
        deletedBy: collections.deletedBy,
      })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceId, workspaceId),
          isNotNull(collections.deletedAt),
        ),
      ),

    db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        deletedAt: templates.deletedAt,
        deletedBy: templates.deletedBy,
      })
      .from(templates)
      .where(
        and(
          eq(templates.workspaceId, workspaceId),
          isNotNull(templates.deletedAt),
        ),
      ),

    db
      .select({
        id: generations.id,
        prompt: generations.prompt,
        projectId: generations.projectId,
        deletedAt: generations.deletedAt,
        deletedBy: generations.deletedBy,
      })
      .from(generations)
      .where(
        and(
          eq(generations.workspaceId, workspaceId),
          isNotNull(generations.deletedAt),
        ),
      ),
  ]);

  const items: TrashedItem[] = [
    ...deletedProjects.map((p) => ({
      id: p.id,
      type: "project" as const,
      name: p.name,
      description: p.description,
      coverKey: p.coverKey,
      deletedAt: (p.deletedAt ?? new Date()).toISOString(),
      deletedBy: p.deletedBy,
      daysRemaining: computeDaysRemaining(p.deletedAt),
    })),
    ...deletedAssets.map((a) => ({
      id: a.id,
      type: "asset" as const,
      name: a.name,
      description: a.description,
      s3Key: a.s3Key,
      thumbnailKey: a.thumbnailKey,
      deletedAt: (a.deletedAt ?? new Date()).toISOString(),
      deletedBy: a.deletedBy,
      daysRemaining: computeDaysRemaining(a.deletedAt),
      extra: { mimeType: a.mimeType, sizeBytes: a.sizeBytes },
    })),
    ...deletedCollections.map((c) => ({
      id: c.id,
      type: "collection" as const,
      name: c.name,
      description: c.description,
      deletedAt: (c.deletedAt ?? new Date()).toISOString(),
      deletedBy: c.deletedBy,
      daysRemaining: computeDaysRemaining(c.deletedAt),
    })),
    ...deletedTemplates.map((t) => ({
      id: t.id,
      type: "template" as const,
      name: t.name,
      description: t.description,
      deletedAt: (t.deletedAt ?? new Date()).toISOString(),
      deletedBy: t.deletedBy,
      daysRemaining: computeDaysRemaining(t.deletedAt),
    })),
    ...deletedGenerations.map((g) => ({
      id: g.id,
      type: "generation" as const,
      name: g.prompt,
      projectId: g.projectId,
      deletedAt: (g.deletedAt ?? new Date()).toISOString(),
      deletedBy: g.deletedBy,
      daysRemaining: computeDaysRemaining(g.deletedAt),
    })),
  ];

  items.sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
  );

  return items;
}

export async function restoreWorkspaceItem(
  userId: string,
  workspaceId: string,
  type: TrashedItemType,
  itemId: string,
) {
  await requireWorkspaceAdmin(userId, workspaceId);

  switch (type) {
    case "project":
      await restoreWorkspaceProject(userId, workspaceId, itemId);
      break;
    case "asset":
      await restoreWorkspaceAsset(userId, workspaceId, itemId);
      break;
    case "collection": {
      const [updated] = await db
        .update(collections)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(
          and(
            eq(collections.workspaceId, workspaceId),
            eq(collections.id, itemId),
            isNotNull(collections.deletedAt),
          ),
        )
        .returning({ id: collections.id });
      if (!updated) throw new ItemNotFoundError();
      break;
    }
    case "template": {
      const [updated] = await db
        .update(templates)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(
          and(
            eq(templates.workspaceId, workspaceId),
            eq(templates.id, itemId),
            isNotNull(templates.deletedAt),
          ),
        )
        .returning({ id: templates.id });
      if (!updated) throw new ItemNotFoundError();
      break;
    }
    case "generation": {
      const [updated] = await db
        .update(generations)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(
          and(
            eq(generations.workspaceId, workspaceId),
            eq(generations.id, itemId),
            isNotNull(generations.deletedAt),
          ),
        )
        .returning({ id: generations.id });
      if (!updated) throw new ItemNotFoundError();
      break;
    }
    default:
      throw new ItemNotFoundError();
  }

  return { success: true as const };
}

export async function permanentlyDeleteWorkspaceItem(
  userId: string,
  workspaceId: string,
  type: TrashedItemType,
  itemId: string,
) {
  // Permanent delete is owner-only
  await requireWorkspaceOwner(userId, workspaceId);

  switch (type) {
    case "project":
      await permanentlyDeleteWorkspaceProject(userId, workspaceId, itemId);
      break;
    case "asset":
      await permanentlyDeleteWorkspaceAsset(userId, workspaceId, itemId);
      break;
    case "collection": {
      const [deleted] = await db
        .delete(collections)
        .where(
          and(
            eq(collections.workspaceId, workspaceId),
            eq(collections.id, itemId),
          ),
        )
        .returning({ id: collections.id });
      if (!deleted) throw new ItemNotFoundError();
      break;
    }
    case "template": {
      const [deleted] = await db
        .delete(templates)
        .where(
          and(
            eq(templates.workspaceId, workspaceId),
            eq(templates.id, itemId),
          ),
        )
        .returning({ id: templates.id });
      if (!deleted) throw new ItemNotFoundError();
      break;
    }
    case "generation": {
      const [deleted] = await db
        .delete(generations)
        .where(
          and(
            eq(generations.workspaceId, workspaceId),
            eq(generations.id, itemId),
          ),
        )
        .returning({ id: generations.id });
      if (!deleted) throw new ItemNotFoundError();
      break;
    }
    default:
      throw new ItemNotFoundError();
  }

  return { success: true as const };
}

// ─── Project Trash (generations inside a project) ──────────────────────────────

export async function listProjectTrash(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<TrashedItem[]> {
  await requireWorkspaceAdmin(userId, workspaceId);

  const deletedGenerations = await db
    .select({
      id: generations.id,
      prompt: generations.prompt,
      projectId: generations.projectId,
      deletedAt: generations.deletedAt,
      deletedBy: generations.deletedBy,
    })
    .from(generations)
    .where(
      and(
        eq(generations.workspaceId, workspaceId),
        eq(generations.projectId, projectId),
        isNotNull(generations.deletedAt),
      ),
    )
    .orderBy(desc(generations.deletedAt));

  return deletedGenerations.map((g) => ({
    id: g.id,
    type: "generation" as const,
    name: g.prompt,
    projectId: g.projectId,
    deletedAt: (g.deletedAt ?? new Date()).toISOString(),
    deletedBy: g.deletedBy,
    daysRemaining: computeDaysRemaining(g.deletedAt),
  }));
}

export async function restoreProjectTrashItem(
  userId: string,
  workspaceId: string,
  projectId: string,
  itemId: string,
) {
  await requireWorkspaceAdmin(userId, workspaceId);

  const [updated] = await db
    .update(generations)
    .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(
      and(
        eq(generations.workspaceId, workspaceId),
        eq(generations.projectId, projectId),
        eq(generations.id, itemId),
        isNotNull(generations.deletedAt),
      ),
    )
    .returning({ id: generations.id });

  if (!updated) throw new ItemNotFoundError();

  return { success: true as const };
}

export async function permanentlyDeleteProjectTrashItem(
  userId: string,
  workspaceId: string,
  projectId: string,
  itemId: string,
) {
  await requireWorkspaceOwner(userId, workspaceId);

  const [deleted] = await db
    .delete(generations)
    .where(
      and(
        eq(generations.workspaceId, workspaceId),
        eq(generations.projectId, projectId),
        eq(generations.id, itemId),
      ),
    )
    .returning({ id: generations.id });

  if (!deleted) throw new ItemNotFoundError();

  return { success: true as const };
}
