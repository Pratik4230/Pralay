"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  TrashedItem,
  TrashedItemType,
  TrashedWorkspace,
} from "@repo/validators";

import {
  globalTrashKeys,
  workspaceKeys,
} from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { TrashedItem, TrashedItemType, TrashedWorkspace };

// ─── Global Trash (workspaces) ────────────────────────────────────────────────

export function useGlobalTrash() {
  return useQuery({
    queryKey: globalTrashKeys.workspaces,
    queryFn: () =>
      fetchApiClient<{ workspaces: TrashedWorkspace[] }>(
        "/api/v1/trash/workspaces",
      ),
  });
}

export function useRestoreGlobalWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/trash/workspaces/${workspaceId}/restore`,
        { method: "POST", body: "{}" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: globalTrashKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function usePermanentlyDeleteGlobalWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/trash/workspaces/${workspaceId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: globalTrashKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

// ─── Workspace Trash (projects, assets, collections, templates, generations) ──

export function useWorkspaceTrash(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.trash(workspaceId),
    queryFn: () =>
      fetchApiClient<{ items: TrashedItem[] }>(
        `/api/v1/workspaces/${workspaceId}/trash`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useRestoreWorkspaceItem(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, itemId }: { type: TrashedItemType; itemId: string }) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/trash/restore`,
        {
          method: "POST",
          body: JSON.stringify({ type, itemId }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.trash(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.projects(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.assets(workspaceId) });
    },
  });
}

export function usePermanentlyDeleteWorkspaceItem(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      itemId,
    }: {
      type: TrashedItemType;
      itemId: string;
    }) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/trash/${type}/${itemId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.trash(workspaceId) });
    },
  });
}

// ─── Project Trash (generations etc.) ────────────────────────────────────────

export function useProjectTrash(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: workspaceKeys.projectTrash(workspaceId, projectId),
    queryFn: () =>
      fetchApiClient<{ items: TrashedItem[] }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}/trash`,
      ),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  });
}

export function useRestoreProjectItem(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}/trash/${itemId}/restore`,
        { method: "POST", body: "{}" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projectTrash(workspaceId, projectId),
      });
    },
  });
}

export function usePermanentlyDeleteProjectItem(
  workspaceId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}/trash/${itemId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projectTrash(workspaceId, projectId),
      });
    },
  });
}
