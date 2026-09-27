import { z } from "zod";

/** Lowercase slug-style names for @mentions (example: jonathan_gaming). */
export const WORKSPACE_ASSET_NAME_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

export const WORKSPACE_ASSET_NAME_INVALID_MESSAGE =
  "Use lowercase letters, numbers, and underscores only (example: jonathan_gaming). No spaces.";

function workspaceAssetNameSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .transform((value) => normalizeWorkspaceAssetDisplayName(value))
    .pipe(
      z
        .string()
        .min(1, "Name is required")
        .max(maxLength, `Name must be at most ${maxLength} characters`)
        .regex(WORKSPACE_ASSET_NAME_PATTERN, WORKSPACE_ASSET_NAME_INVALID_MESSAGE),
    );
}

/** Display name stored on the asset (Create @mentions, library UI). */
export const workspaceAssetDisplayNameSchema = workspaceAssetNameSchema(120);

export const workspaceAssetFileNameSchema = workspaceAssetNameSchema(80);

/** Normalize user input (Jonathan Gaming → jonathan_gaming). Returns "" if nothing valid left. */
export function normalizeWorkspaceAssetDisplayName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** File / storage-key fallback when the source name is empty or invalid. */
export function normalizeWorkspaceAssetDisplayNameOrDefault(raw: string): string {
  const normalized = normalizeWorkspaceAssetDisplayName(raw);
  return normalized.length > 0 ? normalized : "asset";
}

/** @deprecated alias */
export function sanitizeWorkspaceAssetNameCandidate(raw: string): string {
  return normalizeWorkspaceAssetDisplayNameOrDefault(raw);
}

export function parseWorkspaceAssetDisplayName(name: string) {
  return workspaceAssetDisplayNameSchema.parse(name);
}

export function validateWorkspaceAssetDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Name is required";
  }
  const normalized = normalizeWorkspaceAssetDisplayName(trimmed);
  if (!normalized) {
    return WORKSPACE_ASSET_NAME_INVALID_MESSAGE;
  }
  const result = workspaceAssetDisplayNameSchema.safeParse(normalized);
  if (result.success) {
    return null;
  }
  return result.error.issues[0]?.message ?? WORKSPACE_ASSET_NAME_INVALID_MESSAGE;
}

export const workspaceAssetContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

export const assetScopeFilterSchema = z.enum(["workspace", "project"]);

export const createWorkspaceAssetBodySchema = z.object({
  s3Key: z
    .string()
    .trim()
    .min(1, "Storage key is required")
    .max(512, "Storage key must be at most 512 characters"),
  name: workspaceAssetDisplayNameSchema.optional(),
  contentType: workspaceAssetContentTypeSchema,
  sizeBytes: z
    .number()
    .int()
    .positive("File size must be greater than zero")
    .max(20 * 1024 * 1024, "File must be 20 MB or smaller"),
  category: assetCategorySchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  projectId: z.uuid().optional(),
});

export const workspaceAssetSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  primaryProjectId: z.uuid().nullable(),
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

export const listWorkspaceAssetsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(24),
    cursor: z.string().trim().min(1).optional(),
    scope: assetScopeFilterSchema.default("workspace"),
    projectId: z.uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "project" && !value.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "projectId is required when scope is project",
        path: ["projectId"],
      });
    }
  });

export const workspaceAssetListCursorPayloadSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export const deleteWorkspaceAssetResponseSchema = z.object({
  success: z.literal(true),
});

export const updateWorkspaceAssetBodySchema = z.object({
  name: workspaceAssetDisplayNameSchema,
});

export const bulkDeleteWorkspaceAssetsBodySchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1, "At least one asset id is required")
    .max(100, "Cannot delete more than 100 assets at once"),
});

export const bulkDeleteWorkspaceAssetsResponseSchema = z.object({
  deleted: z.array(z.uuid()),
  failed: z.array(z.uuid()),
});

export type CreateWorkspaceAssetUploadBody = z.infer<
  typeof createWorkspaceAssetUploadBodySchema
>;
export type AssetScopeFilter = z.infer<typeof assetScopeFilterSchema>;
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
export type BulkDeleteWorkspaceAssetsBody = z.infer<
  typeof bulkDeleteWorkspaceAssetsBodySchema
>;
export type BulkDeleteWorkspaceAssetsResponse = z.infer<
  typeof bulkDeleteWorkspaceAssetsResponseSchema
>;
export type UpdateWorkspaceAssetBody = z.infer<
  typeof updateWorkspaceAssetBodySchema
>;
