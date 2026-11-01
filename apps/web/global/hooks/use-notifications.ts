"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  notificationListResponseSchema,
  notificationMutationResponseSchema,
  notificationRealtimeEventSchema,
} from "@repo/validators";

import { useInngestRealtimeSubscription } from "@/global/hooks/use-inngest-realtime-subscription";
import { fetchApiClient } from "@/global/utils/api-client";

const notificationsKey = ["notifications"] as const;

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: notificationsKey,
    queryFn: () =>
      fetchApiClient("/api/v1/notifications?limit=20").then((data) =>
        notificationListResponseSchema.parse(data),
      ),
    staleTime: 30_000,
  });
  const refreshNotifications = useCallback(
    (data?: unknown) => {
      if (
        data !== undefined &&
        !notificationRealtimeEventSchema.safeParse(data).success
      ) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
    [queryClient],
  );
  useInngestRealtimeSubscription({
    enabled: true,
    tokenUrl: "/api/v1/notifications/realtime-token",
    onMessage: refreshNotifications,
    onConnected: refreshNotifications,
  });
  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      fetchApiClient(`/api/v1/notifications/${notificationId}/read`, {
        method: "PATCH",
      }).then((data) => notificationMutationResponseSchema.parse(data)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApiClient("/api/v1/notifications/read-all", { method: "POST" }).then(
        (data) => notificationMutationResponseSchema.parse(data),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}
