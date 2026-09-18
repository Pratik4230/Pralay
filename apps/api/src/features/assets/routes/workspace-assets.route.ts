import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  bulkDeleteWorkspaceAssetsBodySchema,
  bulkDeleteWorkspaceAssetsResponseSchema,
  createWorkspaceAssetBodySchema,
  createWorkspaceAssetUploadBodySchema,
  deleteWorkspaceAssetResponseSchema,
  listWorkspaceAssetsQuerySchema,
  workspaceAssetListResponseSchema,
  workspaceAssetSchema,
  workspaceAssetUploadResponseSchema,
} from "@repo/validators";

export const listWorkspaceAssetsRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/assets",
  tags: ["Assets"],
  summary: "List workspace assets",
  description:
    "Returns a paginated list of uploaded assets in the workspace library.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    query: listWorkspaceAssetsQuerySchema,
  },
  responses: {
    200: {
      description: "Asset list page",
      content: {
        "application/json": {
          schema: workspaceAssetListResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid cursor",
      content: { "application/json": { schema: apiErrorSchema } },
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

export const createWorkspaceAssetUploadRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/assets/upload",
  tags: ["Assets"],
  summary: "Create workspace asset upload URL",
  description:
    "Returns a presigned S3 URL for uploading an image to the workspace library.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: createWorkspaceAssetUploadBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Presigned upload URL",
      content: {
        "application/json": {
          schema: workspaceAssetUploadResponseSchema,
        },
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

export const createWorkspaceAssetRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/assets",
  tags: ["Assets"],
  summary: "Register uploaded asset",
  description:
    "Creates an asset record after the file was uploaded to S3 via presigned URL.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: createWorkspaceAssetBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Asset created",
      content: {
        "application/json": {
          schema: z.object({ asset: workspaceAssetSchema }),
        },
      },
    },
    400: {
      description: "Invalid storage key",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    401: {
      description: "Not authenticated",
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

export const deleteWorkspaceAssetRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/assets/{assetId}",
  tags: ["Assets"],
  summary: "Delete workspace asset",
  description:
    "Removes the asset record and deletes the file from S3 (best-effort).",
  request: {
    params: z.object({
      id: z.uuid(),
      assetId: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "Asset deleted",
      content: {
        "application/json": {
          schema: deleteWorkspaceAssetResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace or asset not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const bulkDeleteWorkspaceAssetsRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/assets",
  tags: ["Assets"],
  summary: "Bulk delete workspace assets",
  description:
    "Deletes multiple assets in a single request. Uses one DB query and parallel S3 deletes. Returns which IDs were deleted and which were not found.",
  request: {
    params: z.object({
      id: z.uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: bulkDeleteWorkspaceAssetsBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Bulk delete result",
      content: {
        "application/json": {
          schema: bulkDeleteWorkspaceAssetsResponseSchema,
        },
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
