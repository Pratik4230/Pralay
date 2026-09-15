"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
  WorkspaceListResponse,
  WorkspaceResponse,
} from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: () => fetchApiClient<WorkspaceListResponse>("/api/v1/workspaces"),
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () =>
      fetchApiClient<WorkspaceResponse>(`/api/v1/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWorkspaceBody) =>
      fetchApiClient<WorkspaceResponse>("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateWorkspaceBody) =>
      fetchApiClient<WorkspaceResponse>(`/api/v1/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      fetchApiClient<{ success: true }>(`/api/v1/workspaces/${workspaceId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useAcceptWorkspaceInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      fetchApiClient<{ success: true; workspaceId: string }>(
        "/api/v1/workspace-invites/accept",
        {
          method: "POST",
          body: JSON.stringify({ token }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
