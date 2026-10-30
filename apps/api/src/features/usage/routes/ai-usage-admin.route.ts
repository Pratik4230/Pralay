import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  adjustWorkspaceCreditsBodySchema,
  apiErrorSchema,
  projectAiBudgetResponseSchema,
  updateProjectAiBudgetBodySchema,
  workspaceCreditAdjustmentResponseSchema,
} from "@repo/validators";

const workspaceParams = z.object({ id: z.uuid() });
const projectParams = workspaceParams.extend({ projectId: z.uuid() });

export const updateProjectAiBudgetRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{id}/usage/projects/{projectId}/budget",
  tags: ["Usage"],
  summary: "Set a project monthly AI credit limit",
  request: {
    params: projectParams,
    body: {
      required: true,
      content: {
        "application/json": { schema: updateProjectAiBudgetBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Updated project AI budget",
      content: {
        "application/json": { schema: projectAiBudgetResponseSchema },
      },
    },
    401: {
      description: "Unauthorized",
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

export const adjustWorkspaceCreditsRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/usage/credits/adjustments",
  tags: ["Usage"],
  summary: "Create an audited workspace credit adjustment",
  request: {
    params: workspaceParams,
    body: {
      required: true,
      content: {
        "application/json": { schema: adjustWorkspaceCreditsBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Credit adjustment applied",
      content: {
        "application/json": { schema: workspaceCreditAdjustmentResponseSchema },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    402: {
      description: "Insufficient available credits",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Owner role required",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
