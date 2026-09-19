import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  restoreWorkspaceItemBodySchema,
  trashedItemTypeSchema,
  trashedWorkspaceListResponseSchema,
  trashSuccessResponseSchema,
  workspaceTrashListResponseSchema,
} from "@repo/validators";

// ─── Global Trash ─────────────────────────────────────────────────────────────

export const listGlobalTrashRoute = createRoute({
  method: "get",
  path: "/api/v1/trash/workspaces",
  tags: ["Trash"],
  summary: "List trashed workspaces",
  description: "Returns all soft-deleted workspaces owned by the user.",
  responses: {
    200: {
      description: "Trashed workspaces list",
      content: {
        "application/json": { schema: trashedWorkspaceListResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const restoreGlobalTrashWorkspaceRoute = createRoute({
  method: "post",
  path: "/api/v1/trash/workspaces/{id}/restore",
  tags: ["Trash"],
  summary: "Restore trashed workspace",
  description: "Restores a soft-deleted workspace. Requires owner role.",
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    200: {
      description: "Workspace restored",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden — owner only",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const permanentlyDeleteGlobalWorkspaceRoute = createRoute({
  method: "delete",
  path: "/api/v1/trash/workspaces/{id}",
  tags: ["Trash"],
  summary: "Permanently delete workspace",
  description: "Permanently deletes a workspace and all its data and storage files. Requires owner role.",
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    200: {
      description: "Workspace permanently deleted",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden — owner only",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Workspace Trash ──────────────────────────────────────────────────────────

export const listWorkspaceTrashRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/trash",
  tags: ["Trash"],
  summary: "List workspace trash",
  description: "Returns all soft-deleted items (projects, assets, collections, templates, generations) in the workspace. Requires admin or owner role.",
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    200: {
      description: "Trashed items list",
      content: {
        "application/json": { schema: workspaceTrashListResponseSchema },
      },
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
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const restoreWorkspaceItemRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/trash/restore",
  tags: ["Trash"],
  summary: "Restore workspace item from trash",
  description: "Restores a soft-deleted item in the workspace. Requires admin or owner role.",
  request: {
    params: z.object({ id: z.uuid() }),
    body: {
      content: {
        "application/json": { schema: restoreWorkspaceItemBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Item restored",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
      },
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
      description: "Item or workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const permanentlyDeleteWorkspaceItemRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/trash/{type}/{itemId}",
  tags: ["Trash"],
  summary: "Permanently delete workspace item",
  description: "Permanently deletes an item and cleans up any storage files. Requires owner role.",
  request: {
    params: z.object({
      id: z.uuid(),
      type: trashedItemTypeSchema,
      itemId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Item permanently deleted",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Forbidden — owner only",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Item or workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ─── Project Trash ────────────────────────────────────────────────────────────

export const listProjectTrashRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/trash",
  tags: ["Trash"],
  summary: "List project trash",
  description: "Returns all soft-deleted items within the project. Requires admin or owner role.",
  request: {
    params: z.object({
      id: z.uuid(),
      projectId: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "Project trashed items list",
      content: {
        "application/json": { schema: workspaceTrashListResponseSchema },
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
      description: "Workspace or project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const restoreProjectTrashItemRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/trash/{itemId}/restore",
  tags: ["Trash"],
  summary: "Restore project item from trash",
  description: "Restores a soft-deleted item within a project.",
  request: {
    params: z.object({
      id: z.uuid(),
      projectId: z.uuid(),
      itemId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Item restored",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
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
      description: "Item not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const permanentlyDeleteProjectTrashItemRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/trash/{itemId}",
  tags: ["Trash"],
  summary: "Permanently delete project item",
  description: "Permanently deletes an item from project trash. Requires owner role.",
  request: {
    params: z.object({
      id: z.uuid(),
      projectId: z.uuid(),
      itemId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Item permanently deleted",
      content: {
        "application/json": { schema: trashSuccessResponseSchema },
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
      description: "Item not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
