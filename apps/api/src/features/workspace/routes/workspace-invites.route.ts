import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  acceptWorkspaceInviteBodySchema,
  acceptWorkspaceInviteResponseSchema,
  apiErrorSchema,
  createWorkspaceInviteBodySchema,
  workspaceInviteListResponseSchema,
  workspaceInviteResponseSchema,
} from "@repo/validators";

const workspaceIdParams = z.object({
  id: z.uuid(),
});

const workspaceInviteParams = workspaceIdParams.extend({
  inviteId: z.uuid(),
});

export const listWorkspaceInvitesRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/invites",
  tags: ["Workspace Invites"],
  summary: "List workspace invites",
  request: { params: workspaceIdParams },
  responses: {
    200: {
      description: "Invite list",
      content: {
        "application/json": {
          schema: workspaceInviteListResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Workspace not found", content: { "application/json": { schema: apiErrorSchema } } },
  },
});

export const createWorkspaceInviteRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/invites",
  tags: ["Workspace Invites"],
  summary: "Create workspace invite",
  request: {
    params: workspaceIdParams,
    body: {
      content: {
        "application/json": {
          schema: createWorkspaceInviteBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Invite created",
      content: {
        "application/json": {
          schema: workspaceInviteResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Workspace not found", content: { "application/json": { schema: apiErrorSchema } } },
    409: { description: "Conflict", content: { "application/json": { schema: apiErrorSchema } } },
    422: { description: "Validation error", content: { "application/json": { schema: apiErrorSchema } } },
  },
});

export const revokeWorkspaceInviteRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/invites/{inviteId}",
  tags: ["Workspace Invites"],
  summary: "Revoke workspace invite",
  request: { params: workspaceInviteParams },
  responses: {
    200: {
      description: "Invite revoked",
      content: {
        "application/json": {
          schema: workspaceInviteResponseSchema,
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: apiErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: apiErrorSchema } } },
  },
});

export const acceptWorkspaceInviteRoute = createRoute({
  method: "post",
  path: "/api/v1/workspace-invites/accept",
  tags: ["Workspace Invites"],
  summary: "Accept workspace invite",
  request: {
    body: {
      content: {
        "application/json": {
          schema: acceptWorkspaceInviteBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invite accepted",
      content: {
        "application/json": {
          schema: acceptWorkspaceInviteResponseSchema,
        },
      },
    },
    400: { description: "Invalid invite", content: { "application/json": { schema: apiErrorSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: apiErrorSchema } } },
    409: { description: "Conflict", content: { "application/json": { schema: apiErrorSchema } } },
    422: { description: "Validation error", content: { "application/json": { schema: apiErrorSchema } } },
  },
});
