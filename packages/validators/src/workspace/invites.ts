import { z } from "zod";

import { workspaceRoleSchema } from "./workspace.js";

export const workspaceInviteStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const workspaceInviteSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: workspaceRoleSchema,
  status: workspaceInviteStatusSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export const workspaceInviteListResponseSchema = z.object({
  invites: z.array(workspaceInviteSchema),
});

export const workspaceInviteResponseSchema = z.object({
  invite: workspaceInviteSchema,
});

export const createWorkspaceInviteBodySchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const acceptWorkspaceInviteBodySchema = z.object({
  token: z.string().trim().min(1, "Invite token is required"),
});

export const acceptWorkspaceInviteResponseSchema = z.object({
  success: z.literal(true),
  workspaceId: z.uuid(),
});

export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;
export type WorkspaceInviteListResponse = z.infer<
  typeof workspaceInviteListResponseSchema
>;
export type CreateWorkspaceInviteBody = z.infer<
  typeof createWorkspaceInviteBodySchema
>;
export type AcceptWorkspaceInviteBody = z.infer<
  typeof acceptWorkspaceInviteBodySchema
>;
