import { and, eq, isNull } from "drizzle-orm";

import { db } from "@repo/db";
import { workspaceMembers, workspaces } from "@repo/db/schema";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export class WorkspaceAccessError extends Error {
  constructor(message = "Workspace not found") {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

export class WorkspaceForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "WorkspaceForbiddenError";
  }
}

export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string,
  options?: { allowDeleted?: boolean },
): Promise<WorkspaceMembership | null> {
  const conditions = [
    eq(workspaceMembers.userId, userId),
    eq(workspaceMembers.workspaceId, workspaceId),
  ];
  if (!options?.allowDeleted) {
    conditions.push(isNull(workspaces.deletedAt));
  }

  const [membership] = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(...conditions))
    .limit(1);

  return membership ?? null;
}

export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
  options?: { allowDeleted?: boolean },
): Promise<WorkspaceMembership> {
  const membership = await getWorkspaceMembership(userId, workspaceId, options);

  if (!membership) {
    throw new WorkspaceAccessError();
  }

  return membership;
}

export async function requireWorkspaceAdmin(
  userId: string,
  workspaceId: string,
  options?: { allowDeleted?: boolean },
): Promise<WorkspaceMembership> {
  const membership = await requireWorkspaceMembership(userId, workspaceId, options);

  if (membership.role === "member") {
    throw new WorkspaceForbiddenError();
  }

  return membership;
}

export async function requireWorkspaceOwner(
  userId: string,
  workspaceId: string,
  options?: { allowDeleted?: boolean },
): Promise<WorkspaceMembership> {
  const membership = await requireWorkspaceMembership(userId, workspaceId, options);

  if (membership.role !== "owner") {
    throw new WorkspaceForbiddenError();
  }

  return membership;
}

export function canManageMembers(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}
