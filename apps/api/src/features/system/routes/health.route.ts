import { createRoute } from "@hono/zod-openapi";

import { apiErrorSchema, healthResponseSchema } from "@repo/validators";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  description: "Returns API status and verifies database connectivity.",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
    503: {
      description: "Service unavailable",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
  },
});
