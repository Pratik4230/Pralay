"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
  WorkspaceListResponse,
  WorkspaceResponse,
} from "@/features/workspace/types";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { uploadWorkspaceAvatarFile } from "@/features/workspace/utils/upload-workspace-avatar";
import {
  fetchApiClient,
} from "@/global/utils/api-client";

export type CreateWorkspaceInput = CreateWorkspaceBody & {
  avatarFile?: File | null;
  avatarFileName?: string;
};

export type CreateWorkspaceResult = {
  data: WorkspaceResponse;
  avatarUploadFailed: boolean;
};

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
    mutationFn: async (
      input: CreateWorkspaceInput,
    ): Promise<CreateWorkspaceResult> => {
      const { avatarFile, avatarFileName, ...body } = input;

      let created: WorkspaceResponse;
      try {
        created = await fetchApiClient<WorkspaceResponse>("/api/v1/workspaces", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (error) {
        throw error;
      }

      if (!avatarFile) {
        return { data: created, avatarUploadFailed: false };
      }

      try {
        const updated = await uploadWorkspaceAvatarFile(
          created.workspace.id,
          avatarFile,
          avatarFileName,
        );
        return { data: updated, avatarUploadFailed: false };
      } catch {
        return { data: created, avatarUploadFailed: true };
      }
    },
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
