import { randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@repo/db";
import {
  userWorkspacePreferences,
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from "@repo/db/schema";
import { getEmailSender } from "@repo/email";
import type {
  AcceptWorkspaceInviteBody,
  CreateWorkspaceInviteBody,
} from "@repo/validators";

import { env } from "../../../config/env.js";
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

function buildWorkspaceInviteEmail(input: {
  token: string;
  workspaceName: string;
}) {
  const inviteUrl = `${env.webAppUrl.replace(/\/$/, "")}/invite?token=${encodeURIComponent(input.token)}`;

  return {
    inviteUrl,
    subject: "You have been invited to a Pralay workspace",
    text: [
      `You have been invited to join ${input.workspaceName} on Pralay.`,
      "",
      `Accept your invite: ${inviteUrl}`,
      "",
      "If you already have an account, sign in with this email address first.",
      `You can also paste this invite code on your dashboard: ${input.token}`,
    ].join("\n"),
    html: [
      `<p>You have been invited to join <strong>${input.workspaceName}</strong> on Pralay.</p>`,
      `<p><a href="${inviteUrl}">Accept your invite</a></p>`,
      "<p>If you already have an account, sign in with this email address first.</p>",
      `<p>Invite code: <code>${input.token}</code></p>`,
    ].join(""),
  };
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

  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const emailContent = buildWorkspaceInviteEmail({
    token,
    workspaceName: workspace?.name ?? "a workspace",
  });

  void getEmailSender()({
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
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
