"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Project } from "@repo/validators";

import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

// ─── List ─────────────────────────────────────────────────────────────────────

export function useWorkspaceProjects(
  workspaceId: string,
  status: "active" | "archived" | "all" = "active",
) {
  return useQuery({
    queryKey: [...workspaceKeys.projects(workspaceId), status],
    queryFn: () =>
      fetchApiClient<{ projects: Project[] }>(
        `/api/v1/workspaces/${workspaceId}/projects?status=${status}`,
      ),
    enabled: Boolean(workspaceId),
  });
}

// ─── Get single ───────────────────────────────────────────────────────────────

export function useWorkspaceProject(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: workspaceKeys.project(workspaceId, projectId),
    queryFn: () =>
      fetchApiClient<{ project: Project }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
      ),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateWorkspaceProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      fetchApiClient<{ project: Project }>(
        `/api/v1/workspaces/${workspaceId}/projects`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projects(workspaceId),
      });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateWorkspaceProject(
  workspaceId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string | null;
      coverKey?: string | null;
      status?: "active" | "archived";
    }) =>
      fetchApiClient<{ project: Project }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projects(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.project(workspaceId, projectId),
      });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteWorkspaceProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      fetchApiClient<{ success: boolean }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projects(workspaceId),
      });
    },
  });
}

// ─── Cover upload ─────────────────────────────────────────────────────────────

export async function uploadProjectCoverFile(
  workspaceId: string,
  projectId: string,
  file: File,
): Promise<string> {
  const accepted = ["image/jpeg", "image/png", "image/webp"];
  if (!accepted.includes(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP image");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller");
  }

  // Step 1: get presigned URL
  const { coverKey, uploadUrl } = await fetchApiClient<{
    coverKey: string;
    uploadUrl: string;
    expiresIn: number;
  }>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/cover/upload`, {
    method: "POST",
    body: JSON.stringify({ contentType: file.type }),
  });

  // Step 2: upload to S3 directly
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image to storage");
  }

  return coverKey;
}

export function useUploadProjectCover(
  workspaceId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      uploadProjectCoverFile(workspaceId, projectId, file).then(
        async (coverKey) => {
          // Step 3: save the key on the project
          return fetchApiClient<{ project: Project }>(
            `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ coverKey }),
            },
          );
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projects(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.project(workspaceId, projectId),
      });
    },
  });
}
