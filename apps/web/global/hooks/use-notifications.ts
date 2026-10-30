"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  notificationListResponseSchema,
  notificationMutationResponseSchema,
} from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

const notificationsKey = ["notifications"] as const;

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () =>
      fetchApiClient("/api/v1/notifications?limit=20").then((data) =>
        notificationListResponseSchema.parse(data),
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
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
