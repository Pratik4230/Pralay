"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { uploadWorkspaceAvatarFile } from "@/features/workspace/utils/upload-workspace-avatar";

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
