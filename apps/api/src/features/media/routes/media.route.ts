import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { apiErrorSchema } from "@repo/validators";

export const getMediaRoute = createRoute({
  method: "get",
  path: "/api/v1/media",
  tags: ["Media"],
  summary: "Resolve media URL",
  description:
    "Redirects to a CDN or presigned S3 URL for a stored object key.",
  request: {
    query: z.object({
      key: z.string().min(1).max(512),
    }),
  },
  responses: {
    302: {
      description: "Redirect to media URL",
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Media not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    503: {
      description: "Storage not configured",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
