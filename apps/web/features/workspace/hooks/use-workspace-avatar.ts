"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceResponse } from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { uploadWorkspaceAvatarFile } from "@/features/workspace/utils/upload-workspace-avatar";
import { fetchApiClient } from "@/global/utils/api-client";

export function useUploadWorkspaceAvatar(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; fileName?: string }) =>
      uploadWorkspaceAvatarFile(workspaceId, input.file, input.fileName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}

export function useRemoveWorkspaceAvatar(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApiClient<WorkspaceResponse>(
        `/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ avatarKey: null }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}
