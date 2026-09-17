import { z } from "zod";

export const workspaceAssetContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const workspaceAssetFileNameSchema = z
  .string()
  .trim()
  .min(1, "Image name is required")
  .max(80, "Image name must be at most 80 characters");

export const assetCategorySchema = z.enum([
  "person",
  "logo",
  "product",
  "background",
  "reference",
  "other",
]);

export const createWorkspaceAssetUploadBodySchema = z.object({
  contentType: workspaceAssetContentTypeSchema,
  fileName: workspaceAssetFileNameSchema.optional(),
});

export const workspaceAssetUploadResponseSchema = z.object({
  assetKey: z.string(),
  uploadUrl: z.url(),
  expiresIn: z.number().int().positive(),
});

export const createWorkspaceAssetBodySchema = z.object({
  s3Key: z
    .string()
    .trim()
    .min(1, "Storage key is required")
    .max(512, "Storage key must be at most 512 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters")
    .optional(),
  contentType: workspaceAssetContentTypeSchema,
  sizeBytes: z
    .number()
    .int()
    .positive("File size must be greater than zero")
    .max(20 * 1024 * 1024, "File must be 20 MB or smaller"),
  category: assetCategorySchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const workspaceAssetSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string(),
  category: assetCategorySchema,
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  s3Key: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const workspaceAssetListResponseSchema = z.object({
  assets: z.array(workspaceAssetSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const listWorkspaceAssetsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(24),
  cursor: z.string().trim().min(1).optional(),
});

export const workspaceAssetListCursorPayloadSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export const deleteWorkspaceAssetResponseSchema = z.object({
  success: z.literal(true),
});

export type CreateWorkspaceAssetUploadBody = z.infer<
  typeof createWorkspaceAssetUploadBodySchema
>;
export type CreateWorkspaceAssetBody = z.infer<
  typeof createWorkspaceAssetBodySchema
>;
export type WorkspaceAsset = z.infer<typeof workspaceAssetSchema>;
export type WorkspaceAssetListResponse = z.infer<
  typeof workspaceAssetListResponseSchema
>;
export type ListWorkspaceAssetsQuery = z.infer<
  typeof listWorkspaceAssetsQuerySchema
>;
