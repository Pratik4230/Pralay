import { and, desc, eq, lt, or, sql } from "drizzle-orm";

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
import { parseWorkspaceIdFromAvatarKey } from "@repo/storage";
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

  const conditions = [eq(workspaceMembers.userId, userId)];

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

  await db
    .update(workspaces)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.avatarKey !== undefined ? { avatarKey: input.avatarKey } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(workspaces.id, workspaceId));

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

  const deleted = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });

  if (deleted.length === 0) {
    throw new WorkspaceAccessError();
  }

  return { success: true as const };
}
