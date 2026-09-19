import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  createProjectCoverUploadBodySchema,
  createWorkspaceProjectBodySchema,
  createWorkspaceProjectResponseSchema,
  deleteWorkspaceProjectResponseSchema,
  getWorkspaceProjectResponseSchema,
  listWorkspaceProjectsQuerySchema,
  listWorkspaceProjectsResponseSchema,
  projectCoverUploadResponseSchema,
  updateWorkspaceProjectBodySchema,
  updateWorkspaceProjectResponseSchema,
} from "@repo/validators";

const workspaceProjectParams = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
});

// ─── Create ───────────────────────────────────────────────────────────────────

export const createWorkspaceProjectRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects",
  tags: ["Projects"],
  summary: "Create a workspace project",
  description:
    "Creates a new project inside a workspace. Slug is auto-generated from the name and guaranteed unique within the workspace.",
  request: {
    params: z.object({ id: z.uuid() }),
    body: {
      content: {
        "application/json": { schema: createWorkspaceProjectBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "Project created",
      content: {
        "application/json": { schema: createWorkspaceProjectResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── List ─────────────────────────────────────────────────────────────────────

export const listWorkspaceProjectsRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects",
  tags: ["Projects"],
  summary: "List workspace projects",
  description: "Returns all projects in the workspace the user is a member of.",
  request: {
    params: z.object({ id: z.uuid() }),
    query: listWorkspaceProjectsQuerySchema,
  },
  responses: {
    200: {
      description: "Project list",
      content: {
        "application/json": { schema: listWorkspaceProjectsResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Get single ───────────────────────────────────────────────────────────────

export const getWorkspaceProjectRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects/{projectId}",
  tags: ["Projects"],
  summary: "Get a workspace project",
  request: { params: workspaceProjectParams },
  responses: {
    200: {
      description: "Project",
      content: {
        "application/json": { schema: getWorkspaceProjectResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateWorkspaceProjectRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{id}/projects/{projectId}",
  tags: ["Projects"],
  summary: "Update a workspace project",
  description:
    "Patch project fields (name, description, coverKey, status). Renaming auto-regenerates the slug.",
  request: {
    params: workspaceProjectParams,
    body: {
      content: {
        "application/json": { schema: updateWorkspaceProjectBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Updated project",
      content: {
        "application/json": { schema: updateWorkspaceProjectResponseSchema },
      },
    },
    400: {
      description: "Invalid cover key",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden — status changes require admin or owner role",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteWorkspaceProjectRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/projects/{projectId}",
  tags: ["Projects"],
  summary: "Delete a workspace project",
  request: { params: workspaceProjectParams },
  responses: {
    200: {
      description: "Deleted",
      content: {
        "application/json": { schema: deleteWorkspaceProjectResponseSchema },
      },
    },
    400: {
      description: "Project not archived",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden — admin or owner only",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Cover upload ─────────────────────────────────────────────────────────────

export const createProjectCoverUploadRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/cover/upload",
  tags: ["Projects"],
  summary: "Create project cover upload URL",
  description:
    "Returns a presigned S3 URL for uploading a project cover image.",
  request: {
    params: workspaceProjectParams,
    body: {
      content: {
        "application/json": { schema: createProjectCoverUploadBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Presigned upload URL",
      content: {
        "application/json": { schema: projectCoverUploadResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    503: {
      description: "Storage not configured",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
