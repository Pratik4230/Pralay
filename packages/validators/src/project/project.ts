import { createApiError } from "../common/api-error.js";
import { z } from "zod";

// ─── Project schema (shape returned from the API) ─────────────────────────────

export const projectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  coverKey: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Create ───────────────────────────────────────────────────────────────────

export const createWorkspaceProjectBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

export const createWorkspaceProjectResponseSchema = z.object({
  project: projectSchema,
});

// ─── List ─────────────────────────────────────────────────────────────────────

export const listWorkspaceProjectsQuerySchema = z.object({
  status: z.enum(["active", "archived", "all"]).optional().default("active"),
});

export const listWorkspaceProjectsResponseSchema = z.object({
  projects: z.array(projectSchema),
});

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getWorkspaceProjectResponseSchema = z.object({
  project: projectSchema,
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateWorkspaceProjectBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required")
      .max(100, "Project name must be at most 100 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .nullable()
      .optional(),
    coverKey: z.string().nullable().optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "At least one field must be provided",
  });

export const updateWorkspaceProjectResponseSchema = z.object({
  project: projectSchema,
});

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteWorkspaceProjectResponseSchema = z.object({
  success: z.boolean(),
});

// ─── Cover upload (presigned URL) ─────────────────────────────────────────────

const projectCoverContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const createProjectCoverUploadBodySchema = z.object({
  contentType: projectCoverContentTypeSchema,
  fileName: z.string().trim().min(1).max(80).optional(),
});

export const projectCoverUploadResponseSchema = z.object({
  coverKey: z.string(),
  uploadUrl: z.url(),
  expiresIn: z.number().int().positive(),
});

// ─── Error helpers ────────────────────────────────────────────────────────────

export const projectNotFoundError = createApiError("NOT_FOUND", "Project not found");

// ─── Types ────────────────────────────────────────────────────────────────────

export type Project = z.infer<typeof projectSchema>;
export type CreateWorkspaceProjectBody = z.infer<
  typeof createWorkspaceProjectBodySchema
>;
export type CreateWorkspaceProjectResponse = z.infer<
  typeof createWorkspaceProjectResponseSchema
>;
export type ListWorkspaceProjectsQuery = z.infer<
  typeof listWorkspaceProjectsQuerySchema
>;
export type UpdateWorkspaceProjectBody = z.infer<
  typeof updateWorkspaceProjectBodySchema
>;
export type CreateProjectCoverUploadBody = z.infer<
  typeof createProjectCoverUploadBodySchema
>;
