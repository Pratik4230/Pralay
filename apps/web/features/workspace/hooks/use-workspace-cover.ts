"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceResponse } from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { uploadWorkspaceCoverFile } from "@/features/workspace/utils/upload-workspace-cover";
import { fetchApiClient } from "@/global/utils/api-client";

function invalidateWorkspaceCover(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
) {
  void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  void queryClient.invalidateQueries({
    queryKey: workspaceKeys.detail(workspaceId),
  });
}

export function useUploadWorkspaceCover(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; fileName?: string }) =>
      uploadWorkspaceCoverFile(workspaceId, input.file, input.fileName),
    onSuccess: () => invalidateWorkspaceCover(queryClient, workspaceId),
  });
}

export function useRemoveWorkspaceCover(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApiClient<WorkspaceResponse>(`/api/v1/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ coverImageKey: null }),
      }),
    onSuccess: () => invalidateWorkspaceCover(queryClient, workspaceId),
  });
}
