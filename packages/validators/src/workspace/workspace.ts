import { z } from "zod";

export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);

export const workspaceStatusSchema = z.enum(["active", "archived"]);

export const workspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  avatarKey: z.string().nullable(),
  coverImageKey: z.string().nullable(),
  status: workspaceStatusSchema.default("active"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const workspaceMembershipSchema = z.object({
  role: workspaceRoleSchema,
  joinedAt: z.iso.datetime(),
});

export const workspaceStatsSchema = z.object({
  projectCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
});

export const workspaceWithMembershipSchema = workspaceSchema.extend({
  role: workspaceRoleSchema,
  joinedAt: z.iso.datetime(),
  stats: workspaceStatsSchema,
});

export const workspaceListResponseSchema = z.object({
  workspaces: z.array(workspaceWithMembershipSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const listWorkspacesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});

export const workspaceListCursorPayloadSchema = z.object({
  updatedAt: z.iso.datetime(),
  id: z.uuid(),
});

export const workspaceDetailSchema = workspaceSchema.extend({
  stats: workspaceStatsSchema,
});

export const workspaceResponseSchema = z.object({
  workspace: workspaceDetailSchema,
  membership: workspaceMembershipSchema,
});

export const workspaceSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(42, "Slug must be at most 42 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens",
  );

export const createWorkspaceBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  slug: workspaceSlugSchema.optional(),
});

export const updateWorkspaceBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(80, "Name must be at most 80 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .nullable()
      .optional(),
    slug: workspaceSlugSchema.optional(),
    avatarKey: z
      .string()
      .trim()
      .min(1, "Avatar key is required")
      .max(512, "Avatar key must be at most 512 characters")
      .nullable()
      .optional(),
    coverImageKey: z
      .string()
      .trim()
      .min(1, "Cover image key is required")
      .max(512, "Cover image key must be at most 512 characters")
      .nullable()
      .optional(),
    status: workspaceStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.slug !== undefined ||
      value.avatarKey !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );

export const deleteWorkspaceResponseSchema = z.object({
  success: z.literal(true),
});

export const workspaceAvatarContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const workspaceAvatarFileNameSchema = z
  .string()
  .trim()
  .min(1, "Image name is required")
  .max(80, "Image name must be at most 80 characters");

export const createWorkspaceAvatarUploadBodySchema = z.object({
  contentType: workspaceAvatarContentTypeSchema,
  fileName: workspaceAvatarFileNameSchema.optional(),
});

export const workspaceAvatarUploadResponseSchema = z.object({
  avatarKey: z.string(),
  uploadUrl: z.url(),
  expiresIn: z.number().int().positive(),
});

// Cover image upload (same content type support as avatar)
export const createWorkspaceCoverUploadBodySchema = z.object({
  contentType: workspaceAvatarContentTypeSchema,
  fileName: workspaceAvatarFileNameSchema.optional(),
});

export const workspaceCoverUploadResponseSchema = z.object({
  coverImageKey: z.string(),
  uploadUrl: z.url(),
  expiresIn: z.number().int().positive(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStats = z.infer<typeof workspaceStatsSchema>;
export type WorkspaceWithMembership = z.infer<
  typeof workspaceWithMembershipSchema
>;
export type WorkspaceListResponse = z.infer<typeof workspaceListResponseSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type CreateWorkspaceCoverUploadBody = z.infer<
  typeof createWorkspaceCoverUploadBodySchema
>;
