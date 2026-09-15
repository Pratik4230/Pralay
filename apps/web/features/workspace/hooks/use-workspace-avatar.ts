"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceResponse } from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

export function useUploadWorkspaceAvatar(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const contentType = file.type;
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
        throw new Error("Use a JPG, PNG, or WebP image");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be 5 MB or smaller");
      }

      const upload = await fetchApiClient<{
        avatarKey: string;
        uploadUrl: string;
        expiresIn: number;
      }>(`/api/v1/workspaces/${workspaceId}/avatar/upload`, {
        method: "POST",
        body: JSON.stringify({ contentType }),
      });

      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": contentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload avatar to storage");
      }

      return fetchApiClient<WorkspaceResponse>(
        `/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ avatarKey: upload.avatarKey }),
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}
