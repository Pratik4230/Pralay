"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateWorkspaceInviteBody,
  WorkspaceInviteListResponse,
} from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.invites(workspaceId),
    queryFn: () =>
      fetchApiClient<WorkspaceInviteListResponse>(
        `/api/v1/workspaces/${workspaceId}/invites`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWorkspaceInvite(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWorkspaceInviteBody) =>
      fetchApiClient<{ invite: WorkspaceInviteListResponse["invites"][number] }>(
        `/api/v1/workspaces/${workspaceId}/invites`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invites(workspaceId),
      });
    },
  });
}

export function useRevokeWorkspaceInvite(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      fetchApiClient<{ invite: WorkspaceInviteListResponse["invites"][number] }>(
        `/api/v1/workspaces/${workspaceId}/invites/${inviteId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invites(workspaceId),
      });
    },
  });
}
