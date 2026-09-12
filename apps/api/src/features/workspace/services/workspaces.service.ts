import { and, eq, sql } from "drizzle-orm";

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
import type { CreateWorkspaceBody, UpdateWorkspaceBody } from "@repo/validators";

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

export async function listWorkspacesForUser(userId: string) {
  const rows = await db
    .select(workspaceSelect)
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  return rows.map(mapWorkspaceRow);
}

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
