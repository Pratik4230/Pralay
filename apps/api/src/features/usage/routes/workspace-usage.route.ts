import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  workspaceUsageQuerySchema,
  updateWorkspaceUsageBudgetBodySchema,
  workspaceUsageBudgetResponseSchema,
  workspaceUsageSummaryResponseSchema,
} from "@repo/validators";

export const getWorkspaceUsageRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/usage",
  tags: ["Usage"],
  summary: "Get workspace AI usage and credits",
  request: {
    params: z.object({ id: z.uuid() }),
    query: workspaceUsageQuerySchema,
  },
  responses: {
    200: {
      description: "Workspace usage summary",
      content: {
        "application/json": { schema: workspaceUsageSummaryResponseSchema },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const updateWorkspaceUsageBudgetRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{id}/usage/budget",
  tags: ["Usage"],
  summary: "Update workspace AI budget alerts",
  request: {
    params: z.object({ id: z.uuid() }),
    body: {
      required: true,
      content: {
        "application/json": { schema: updateWorkspaceUsageBudgetBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Updated budget settings",
      content: {
        "application/json": { schema: workspaceUsageBudgetResponseSchema },
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
      description: "Workspace not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
