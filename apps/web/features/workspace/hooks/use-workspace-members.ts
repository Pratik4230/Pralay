"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  UpdateWorkspaceMemberBody,
  WorkspaceMemberListResponse,
} from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () =>
      fetchApiClient<WorkspaceMemberListResponse>(
        `/api/v1/workspaces/${workspaceId}/members`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdateWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      body,
    }: {
      memberId: string;
      body: UpdateWorkspaceMemberBody;
    }) =>
      fetchApiClient<{ member: WorkspaceMemberListResponse["members"][number] }>(
        `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
