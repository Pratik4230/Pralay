import { z } from "zod";

export const trashedItemTypeSchema = z.enum([
  "project",
  "asset",
  "collection",
  "template",
  "generation",
]);

export const trashedWorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  avatarKey: z.string().nullable(),
  deletedAt: z.iso.datetime(),
  deletedBy: z.string().nullable(),
  daysRemaining: z.number().int().min(0).max(29),
});

export const trashedWorkspaceListResponseSchema = z.object({
  workspaces: z.array(trashedWorkspaceSchema),
});

export const trashedItemSchema = z.object({
  id: z.string(),
  type: trashedItemTypeSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  coverKey: z.string().nullable().optional(),
  thumbnailKey: z.string().nullable().optional(),
  s3Key: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  deletedAt: z.iso.datetime(),
  deletedBy: z.string().nullable(),
  daysRemaining: z.number().int().min(0).max(29),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export const workspaceTrashListResponseSchema = z.object({
  items: z.array(trashedItemSchema),
});

export const restoreWorkspaceItemBodySchema = z.object({
  type: trashedItemTypeSchema,
  itemId: z.string(),
});

export const trashSuccessResponseSchema = z.object({
  success: z.literal(true),
});

export type TrashedItemType = z.infer<typeof trashedItemTypeSchema>;
export type TrashedWorkspace = z.infer<typeof trashedWorkspaceSchema>;
export type TrashedWorkspaceListResponse = z.infer<
  typeof trashedWorkspaceListResponseSchema
>;
export type TrashedItem = z.infer<typeof trashedItemSchema>;
export type WorkspaceTrashListResponse = z.infer<
  typeof workspaceTrashListResponseSchema
>;
export type RestoreWorkspaceItemBody = z.infer<
  typeof restoreWorkspaceItemBodySchema
>;
export type TrashSuccessResponse = z.infer<typeof trashSuccessResponseSchema>;
