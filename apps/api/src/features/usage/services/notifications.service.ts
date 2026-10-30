import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@repo/db";
import { notifications } from "@repo/db/schema";

function mapNotification(row: typeof notifications.$inferSelect) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUserNotifications(userId: string, limit = 20) {
  const [rows, unreadRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(Math.max(1, Math.min(50, limit))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      ),
  ]);
  return {
    unreadCount: unreadRows[0]?.count ?? 0,
    notifications: rows.map(mapNotification),
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
