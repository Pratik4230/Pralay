import type { Context } from "hono";

import {
  notificationListResponseSchema,
  notificationMutationResponseSchema,
  unauthorizedError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";

export async function listNotificationsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const limit = Math.max(1, Math.min(50, Number(c.req.query("limit") ?? 20)));
  return c.json(
    notificationListResponseSchema.parse(
      await listUserNotifications(session.user.id, limit),
    ),
    200,
  );
}

export async function markNotificationReadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const notificationId = c.req.param("notificationId");
  if (!notificationId)
    return c.json(notificationMutationResponseSchema.parse({ ok: true }), 200);
  await markNotificationRead(session.user.id, notificationId);
  return c.json(notificationMutationResponseSchema.parse({ ok: true }), 200);
}

export async function markAllNotificationsReadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  await markAllNotificationsRead(session.user.id);
  return c.json(notificationMutationResponseSchema.parse({ ok: true }), 200);
}
