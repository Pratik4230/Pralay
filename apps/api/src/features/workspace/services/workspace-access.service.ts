import { and, eq } from "drizzle-orm";

import { db } from "@repo/db";
import { workspaceMembers } from "@repo/db/schema";

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
): Promise<WorkspaceMembership | null> {
  const [membership] = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMembership> {
  const membership = await getWorkspaceMembership(userId, workspaceId);

  if (!membership) {
    throw new WorkspaceAccessError();
  }

  return membership;
}

export async function requireWorkspaceAdmin(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMembership> {
  const membership = await requireWorkspaceMembership(userId, workspaceId);

  if (membership.role === "member") {
    throw new WorkspaceForbiddenError();
  }

  return membership;
}

export async function requireWorkspaceOwner(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMembership> {
  const membership = await requireWorkspaceMembership(userId, workspaceId);

  if (membership.role !== "owner") {
    throw new WorkspaceForbiddenError();
  }

  return membership;
}

export function canManageMembers(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}
