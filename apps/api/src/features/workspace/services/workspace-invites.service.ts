import { randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@repo/db";
import {
  user,
  userWorkspacePreferences,
  workspaceInvites,
  workspaceMembers,
} from "@repo/db/schema";
import { consoleEmailSender } from "@repo/email";
import type {
  AcceptWorkspaceInviteBody,
  CreateWorkspaceInviteBody,
} from "@repo/validators";

import { requireWorkspaceAdmin } from "./workspace-access.service.js";
import {
  isWorkspaceMemberByEmail,
  MemberConflictError,
} from "./workspace-members.service.js";

const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

export class InviteNotFoundError extends Error {
  constructor() {
    super("Invite not found");
    this.name = "InviteNotFoundError";
  }
}

export class InviteConflictError extends Error {
  constructor() {
    super("An active invite already exists for this email");
    this.name = "InviteConflictError";
  }
}

export class InviteInvalidError extends Error {
  constructor() {
    super("Invite is invalid or expired");
    this.name = "InviteInvalidError";
  }
}

function mapInvite(row: {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listWorkspaceInvites(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceAdmin(userId, workspaceId);

  const rows = await db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      status: workspaceInvites.status,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(eq(workspaceInvites.workspaceId, workspaceId));

  return rows.map(mapInvite);
}

export async function createWorkspaceInvite(
  actorUserId: string,
  workspaceId: string,
  input: CreateWorkspaceInviteBody,
) {
  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const email = normalizeEmail(input.email);

  if (await isWorkspaceMemberByEmail(workspaceId, email)) {
    throw new MemberConflictError();
  }

  const [existingInvite] = await db
    .select({ id: workspaceInvites.id })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.email, email),
        eq(workspaceInvites.status, "pending"),
        gt(workspaceInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (existingInvite) {
    throw new InviteConflictError();
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + inviteTtlMs);

  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId,
      email,
      role: input.role,
      token,
      expiresAt,
      invitedBy: actorUserId,
    })
    .returning({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      status: workspaceInvites.status,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    });

  if (!invite) {
    throw new Error("Failed to create workspace invite");
  }

  void consoleEmailSender({
    to: email,
    subject: "You have been invited to a Pralay workspace",
    text: `You have been invited to join a workspace on Pralay.\n\nSign in with this email address and use invite code ${token} to join.`,
  });

  return mapInvite(invite);
}

export async function revokeWorkspaceInvite(
  actorUserId: string,
  workspaceId: string,
  inviteId: string,
) {
  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const [invite] = await db
    .update(workspaceInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.status, "pending"),
      ),
    )
    .returning({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      status: workspaceInvites.status,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    });

  if (!invite) {
    throw new InviteNotFoundError();
  }

  return mapInvite(invite);
}

export async function acceptWorkspaceInvite(
  userId: string,
  userEmail: string,
  input: AcceptWorkspaceInviteBody,
) {
  const email = normalizeEmail(userEmail);
  const now = new Date();

  const [invite] = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      status: workspaceInvites.status,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(eq(workspaceInvites.token, input.token))
    .limit(1);

  if (
    !invite ||
    invite.status !== "pending" ||
    invite.expiresAt.getTime() <= now.getTime()
  ) {
    throw new InviteInvalidError();
  }

  if (invite.email !== email) {
    throw new InviteInvalidError();
  }

  if (await isWorkspaceMemberByEmail(invite.workspaceId, email)) {
    await db
      .update(workspaceInvites)
      .set({ status: "accepted" })
      .where(eq(workspaceInvites.id, invite.id));

    throw new MemberConflictError();
  }

  await db.transaction(async (tx) => {
    await tx.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    });

    await tx.insert(userWorkspacePreferences).values({
      userId,
      workspaceId: invite.workspaceId,
    });

    await tx
      .update(workspaceInvites)
      .set({ status: "accepted" })
      .where(eq(workspaceInvites.id, invite.id));
  });

  return { success: true as const, workspaceId: invite.workspaceId };
}
