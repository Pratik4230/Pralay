import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  userWorkspacePreferences,
  workspaceMembers,
  workspaces,
} from "@repo/db/schema";
import {
  createUniqueWorkspaceSlug,
  isWorkspaceSlugTaken,
} from "@repo/db/utils/workspace-slug";
import { parseWorkspaceIdFromAvatarKey, deleteObject, deleteWorkspaceUploadObjects } from "@repo/storage";
import type { CreateWorkspaceBody, ListWorkspacesQuery, UpdateWorkspaceBody } from "@repo/validators";

import {
  decodeWorkspaceListCursor,
  encodeWorkspaceListCursor,
  WorkspaceListCursorError,
} from "./workspace-list-cursor.js";
import {
  requireWorkspaceAdmin,
  requireWorkspaceOwner,
  WorkspaceAccessError,
} from "./workspace-access.service.js";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarKey: string | null;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
};

export class WorkspaceSlugTakenError extends Error {
  constructor() {
    super("Workspace slug is already taken");
    this.name = "WorkspaceSlugTakenError";
  }
}

export class InvalidWorkspaceMediaKeyError extends Error {
  constructor() {
    super("Media key is not valid for this workspace");
    this.name = "InvalidWorkspaceMediaKeyError";
  }
}

export function mapWorkspaceRow(row: WorkspaceRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    avatarKey: row.avatarKey,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  };
}

const workspaceSelect = {
  id: workspaces.id,
  name: workspaces.name,
  slug: workspaces.slug,
  description: workspaces.description,
  avatarKey: workspaces.avatarKey,
  status: workspaces.status,
  createdAt: workspaces.createdAt,
  updatedAt: workspaces.updatedAt,
  role: workspaceMembers.role,
  joinedAt: workspaceMembers.joinedAt,
};

export async function listWorkspacesForUser(
  userId: string,
  query: ListWorkspacesQuery = { limit: 20 },
) {
  const limit = query.limit;
  const fetchLimit = limit + 1;

  const conditions = [
    eq(workspaceMembers.userId, userId),
    isNull(workspaces.deletedAt),
  ];

  if (query.cursor) {
    const cursor = decodeWorkspaceListCursor(query.cursor);
    conditions.push(
      or(
        lt(workspaces.updatedAt, cursor.updatedAt),
        and(
          eq(workspaces.updatedAt, cursor.updatedAt),
          lt(workspaces.id, cursor.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select(workspaceSelect)
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(...conditions))
    .orderBy(desc(workspaces.updatedAt), desc(workspaces.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    workspaces: pageRows.map(mapWorkspaceRow),
    nextCursor:
      hasMore && lastRow
        ? encodeWorkspaceListCursor({
            updatedAt: lastRow.updatedAt,
            id: lastRow.id,
          })
        : null,
    hasMore,
  };
}

export { WorkspaceListCursorError };

export async function getWorkspaceForUser(userId: string, workspaceId: string) {
  const [row] = await db
    .select(workspaceSelect)
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.id, workspaceId),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  return row ? mapWorkspaceRow(row) : null;
}

export async function createWorkspaceForUser(
  userId: string,
  input: CreateWorkspaceBody,
) {
  const slug = input.slug ?? (await createUniqueWorkspaceSlug(input.name));

  if (input.slug && (await isWorkspaceSlugTaken(input.slug))) {
    throw new WorkspaceSlugTakenError();
  }

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: input.name,
        slug,
        description: input.description ?? null,
      })
      .returning({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        avatarKey: workspaces.avatarKey,
        status: workspaces.status,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      });

    if (!workspace) {
      throw new Error("Failed to create workspace");
    }

    const [membership] = await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      })
      .returning({
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      });

    if (!membership) {
      throw new Error("Failed to create workspace membership");
    }

    await tx.insert(userWorkspacePreferences).values({
      userId,
      workspaceId: workspace.id,
    });

    return mapWorkspaceRow({
      ...workspace,
      role: membership.role,
      joinedAt: membership.joinedAt,
    });
  });
}

export async function updateWorkspaceForUser(
  userId: string,
  workspaceId: string,
  input: UpdateWorkspaceBody,
) {
  await requireWorkspaceAdmin(userId, workspaceId);

  if (input.slug && (await isWorkspaceSlugTaken(input.slug))) {
    const [current] = await db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (current?.slug !== input.slug) {
      throw new WorkspaceSlugTakenError();
    }
  }

  if (input.avatarKey !== undefined && input.avatarKey !== null) {
    const keyWorkspaceId = parseWorkspaceIdFromAvatarKey(input.avatarKey);
    if (keyWorkspaceId !== workspaceId) {
      throw new InvalidWorkspaceMediaKeyError();
    }
  }

  let previousAvatarKey: string | null = null;
  if (input.avatarKey !== undefined) {
    const [existing] = await db
      .select({ avatarKey: workspaces.avatarKey })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    previousAvatarKey = existing?.avatarKey ?? null;
  }

  await db
    .update(workspaces)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.avatarKey !== undefined ? { avatarKey: input.avatarKey } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(workspaces.id, workspaceId));

  if (
    input.avatarKey !== undefined &&
    previousAvatarKey &&
    previousAvatarKey !== input.avatarKey
  ) {
    try {
      await deleteObject(previousAvatarKey);
    } catch {
      // Best-effort cleanup; DB is already updated.
    }
  }

  const workspace = await getWorkspaceForUser(userId, workspaceId);

  if (!workspace) {
    throw new WorkspaceAccessError();
  }

  return workspace;
}

export async function deleteWorkspaceForUser(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceOwner(userId, workspaceId);

  const [existing] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new WorkspaceAccessError();
  }

  // Soft delete — moves to Trash with 29-day recovery window
  await db
    .update(workspaces)
    .set({
      deletedAt: sql`now()`,
      deletedBy: userId,
    })
    .where(eq(workspaces.id, workspaceId));

  return { success: true as const };
}

export async function restoreWorkspaceForUser(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceOwner(userId, workspaceId, { allowDeleted: true });

  const [existing] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), isNotNull(workspaces.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new WorkspaceAccessError();
  }

  await db
    .update(workspaces)
    .set({
      deletedAt: null,
      deletedBy: null,
      updatedAt: sql`now()`,
    })
    .where(eq(workspaces.id, workspaceId));

  return { success: true as const };
}

export async function permanentlyDeleteWorkspaceForUser(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceOwner(userId, workspaceId, { allowDeleted: true });

  const deleted = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });

  if (deleted.length === 0) {
    throw new WorkspaceAccessError();
  }

  try {
    await deleteWorkspaceUploadObjects(workspaceId);
  } catch {
    // Best-effort cleanup after workspace row is removed.
  }

  return { success: true as const };
}

export async function listTrashedWorkspacesForUser(userId: string) {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      avatarKey: workspaces.avatarKey,
      deletedAt: workspaces.deletedAt,
      deletedBy: workspaces.deletedBy,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.role, "owner"),
        isNotNull(workspaces.deletedAt),
      ),
    )
    .orderBy(desc(workspaces.deletedAt));

  return rows.map((r) => {
    const deletedDate = r.deletedAt ?? new Date();
    const ageMs = Date.now() - deletedDate.getTime();
    const daysSinceDeleted = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 29 - daysSinceDeleted);

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      avatarKey: r.avatarKey,
      deletedAt: deletedDate.toISOString(),
      deletedBy: r.deletedBy,
      daysRemaining,
    };
  });
}
