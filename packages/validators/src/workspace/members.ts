import { z } from "zod";

import { workspaceRoleSchema } from "./workspace.js";

export const workspaceMemberUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});

export const workspaceMemberSchema = z.object({
  id: z.uuid(),
  role: workspaceRoleSchema,
  joinedAt: z.iso.datetime(),
  user: workspaceMemberUserSchema,
});

export const workspaceMemberListResponseSchema = z.object({
  members: z.array(workspaceMemberSchema),
});

export const updateWorkspaceMemberBodySchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const deleteWorkspaceMemberResponseSchema = z.object({
  success: z.literal(true),
});

export const workspaceMemberResponseSchema = z.object({
  member: workspaceMemberSchema,
});

export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceMemberListResponse = z.infer<
  typeof workspaceMemberListResponseSchema
>;
export type UpdateWorkspaceMemberBody = z.infer<
  typeof updateWorkspaceMemberBodySchema
>;
