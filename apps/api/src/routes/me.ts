import { createRoute } from "@hono/zod-openapi";

import {
  apiErrorSchema,
  meResponseSchema,
} from "@repo/validators";

export const meRoute = createRoute({
  method: "get",
  path: "/api/v1/me",
  tags: ["Auth"],
  summary: "Current user",
  description: "Returns the authenticated user and session.",
  responses: {
    200: {
      description: "Authenticated user",
      content: {
        "application/json": {
          schema: meResponseSchema,
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
