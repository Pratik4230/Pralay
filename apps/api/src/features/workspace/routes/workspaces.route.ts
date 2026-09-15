import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  createWorkspaceAvatarUploadBodySchema,
  createWorkspaceBodySchema,
  deleteWorkspaceResponseSchema,
  updateWorkspaceBodySchema,
  workspaceAvatarUploadResponseSchema,
  workspaceListResponseSchema,
  workspaceResponseSchema,
} from "@repo/validators";

export const listWorkspacesRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces",
  tags: ["Workspaces"],
  summary: "List workspaces",
  description: "Returns workspaces the authenticated user belongs to.",
  responses: {
    200: {
      description: "Workspace list",
      content: {
        "application/json": {
          schema: workspaceListResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
  },
});

export const createWorkspaceRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces",
  tags: ["Workspaces"],
  summary: "Create workspace",
  description:
    "Creates a workspace and adds the authenticated user as owner.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createWorkspaceBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Workspace created",
      content: {
        "application/json": {
          schema: workspaceResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
    409: {
      description: "Slug already taken",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
    422: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
  },
});

export const getWorkspaceRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}",
  tags: ["Workspaces"],
  summary: "Get workspace",
  description: "Returns a workspace if the authenticated user is a member.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "Workspace details",
      content: {
        "application/json": {
          schema: workspaceResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
    404: {
      description: "Workspace not found",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
  },
});

export const updateWorkspaceRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{id}",
  tags: ["Workspaces"],
  summary: "Update workspace",
  description: "Updates a workspace. Requires owner or admin role.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateWorkspaceBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Workspace updated",
      content: {
        "application/json": {
          schema: workspaceResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "Slug already taken",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const deleteWorkspaceRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}",
  tags: ["Workspaces"],
  summary: "Delete workspace",
  description: "Deletes a workspace. Requires owner role.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "Workspace deleted",
      content: {
        "application/json": {
          schema: deleteWorkspaceResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const createWorkspaceAvatarUploadRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/avatar/upload",
  tags: ["Workspaces"],
  summary: "Create workspace avatar upload URL",
  description:
    "Returns a presigned S3 URL for uploading a workspace avatar. Requires owner or admin role.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: createWorkspaceAvatarUploadBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Presigned upload URL",
      content: {
        "application/json": {
          schema: workspaceAvatarUploadResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
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
