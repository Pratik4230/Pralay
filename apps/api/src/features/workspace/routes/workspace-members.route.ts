import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  deleteWorkspaceMemberResponseSchema,
  updateWorkspaceMemberBodySchema,
  workspaceMemberListResponseSchema,
  workspaceMemberResponseSchema,
} from "@repo/validators";

const workspaceIdParams = z.object({
  id: z.uuid(),
});

const workspaceMemberParams = workspaceIdParams.extend({
  memberId: z.uuid(),
});

export const listWorkspaceMembersRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/members",
  tags: ["Workspace Members"],
  summary: "List workspace members",
  request: { params: workspaceIdParams },
  responses: {
    200: {
      description: "Member list",
      content: {
        "application/json": {
          schema: workspaceMemberListResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Workspace not found", content: { "application/json": { schema: apiErrorSchema } } },
  },
});

export const updateWorkspaceMemberRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{id}/members/{memberId}",
  tags: ["Workspace Members"],
  summary: "Update member role",
  request: {
    params: workspaceMemberParams,
    body: {
      content: {
        "application/json": {
          schema: updateWorkspaceMemberBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Member updated",
      content: {
        "application/json": {
          schema: workspaceMemberResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: apiErrorSchema } } },
    422: { description: "Validation error", content: { "application/json": { schema: apiErrorSchema } } },
  },
});

export const deleteWorkspaceMemberRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/members/{memberId}",
  tags: ["Workspace Members"],
  summary: "Remove workspace member",
  request: { params: workspaceMemberParams },
  responses: {
    200: {
      description: "Member removed",
      content: {
        "application/json": {
          schema: deleteWorkspaceMemberResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: apiErrorSchema } } },
  },
});
