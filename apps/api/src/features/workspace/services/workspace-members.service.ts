import { and, eq, sql } from "drizzle-orm";

import { db } from "@repo/db";
import { user, workspaceMembers } from "@repo/db/schema";
import type { UpdateWorkspaceMemberBody } from "@repo/validators";

import {
  requireWorkspaceAdmin,
  requireWorkspaceMembership,
  WorkspaceForbiddenError,
  type WorkspaceRole,
} from "./workspace-access.service.js";

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found");
    this.name = "MemberNotFoundError";
  }
}

export class MemberConflictError extends Error {
  constructor() {
    super("User is already a member of this workspace");
    this.name = "MemberConflictError";
  }
}

function mapMember(row: {
  id: string;
  role: WorkspaceRole;
  joinedAt: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      image: row.userImage,
    },
  };
}

export async function listWorkspaceMembers(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceMembership(userId, workspaceId);

  const rows = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return rows.map(mapMember);
}

export async function updateWorkspaceMemberRole(
  actorUserId: string,
  workspaceId: string,
  memberId: string,
  input: UpdateWorkspaceMemberBody,
) {
  const actor = await requireWorkspaceAdmin(actorUserId, workspaceId);

  const [target] = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      userId: workspaceMembers.userId,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new MemberNotFoundError();
  }

  if (target.role === "owner") {
    throw new WorkspaceForbiddenError("The workspace owner cannot be updated");
  }

  if (actor.role === "admin" && target.role === "admin") {
    throw new WorkspaceForbiddenError();
  }

  await db
    .update(workspaceMembers)
    .set({ role: input.role })
    .where(eq(workspaceMembers.id, memberId));

  const members = await listWorkspaceMembers(actorUserId, workspaceId);
  const updated = members.find((member) => member.id === memberId);

  if (!updated) {
    throw new MemberNotFoundError();
  }

  return updated;
}

export async function removeWorkspaceMember(
  actorUserId: string,
  workspaceId: string,
  memberId: string,
) {
  const actor = await requireWorkspaceAdmin(actorUserId, workspaceId);

  const [target] = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new MemberNotFoundError();
  }

  if (target.role === "owner") {
    throw new WorkspaceForbiddenError("The workspace owner cannot be removed");
  }

  if (actor.role === "admin" && target.role === "admin") {
    throw new WorkspaceForbiddenError();
  }

  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));

  return { success: true as const };
}

export async function isWorkspaceMemberByEmail(
  workspaceId: string,
  email: string,
) {
  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        sql`lower(${user.email}) = ${email}`,
      ),
    )
    .limit(1);

  return Boolean(existing);
}
