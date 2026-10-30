import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  notificationListResponseSchema,
  notificationMutationResponseSchema,
} from "@repo/validators";

const mutationResponses = {
  200: {
    description: "Notification state updated",
    content: {
      "application/json": { schema: notificationMutationResponseSchema },
    },
  },
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: apiErrorSchema } },
  },
} as const;

export const listNotificationsRoute = createRoute({
  method: "get",
  path: "/api/v1/notifications",
  tags: ["Notifications"],
  summary: "List the current user's notifications",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  },
  responses: {
    200: {
      description: "Notifications",
      content: {
        "application/json": { schema: notificationListResponseSchema },
      },
    },
    401: mutationResponses[401],
  },
});

export const markNotificationReadRoute = createRoute({
  method: "patch",
  path: "/api/v1/notifications/{notificationId}/read",
  tags: ["Notifications"],
  summary: "Mark one notification as read",
  request: { params: z.object({ notificationId: z.uuid() }) },
  responses: mutationResponses,
});

export const markAllNotificationsReadRoute = createRoute({
  method: "post",
  path: "/api/v1/notifications/read-all",
  tags: ["Notifications"],
  summary: "Mark every notification as read",
  responses: mutationResponses,
});
