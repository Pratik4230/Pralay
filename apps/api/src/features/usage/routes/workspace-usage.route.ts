import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  workspaceUsageQuerySchema,
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
