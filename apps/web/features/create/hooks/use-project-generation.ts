"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Generation } from "@repo/validators";

import { CREATE_GENERATION_POLL_MS } from "@/features/create/constants/create-timing";
import {
  fetchProjectGenerationHistory,
  fetchProjectGeneration,
  retryProjectGeneration,
} from "@/features/create/utils/fetch-project-generation";
import { createKeys } from "@/features/create/utils/query-keys";

function isGenerationActive(status: Generation["status"]) {
  return status === "queued" || status === "processing";
}

export function useRetryProjectGeneration(
  workspaceId: string,
  projectId: string,
  generationId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = createKeys.generation(workspaceId, projectId, generationId);

  return useMutation({
    mutationFn: () =>
      retryProjectGeneration(workspaceId, projectId, generationId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useProjectGeneration(
  workspaceId: string,
  projectId: string,
  generationId: string | null | undefined,
  options?: { pollWhileActive?: boolean },
) {
  const pollWhileActive = options?.pollWhileActive ?? true;

  return useQuery({
    queryKey: createKeys.generation(
      workspaceId,
      projectId,
      generationId ?? "none",
    ),
    queryFn: () =>
      fetchProjectGeneration(workspaceId, projectId, generationId!),
    enabled:
      pollWhileActive &&
      Boolean(workspaceId) &&
      Boolean(projectId) &&
      Boolean(generationId),
    refetchInterval: (query) => {
      const status = query.state.data?.generation.status;
      if (!status || !isGenerationActive(status)) {
        return false;
      }
      return CREATE_GENERATION_POLL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

export function useProjectGenerationHistory(
  workspaceId: string,
  projectId: string,
  generationId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: createKeys.generationHistory(
      workspaceId,
      projectId,
      generationId ?? "none",
    ),
    queryFn: () =>
      fetchProjectGenerationHistory(workspaceId, projectId, generationId!),
    enabled:
      enabled &&
      Boolean(workspaceId) &&
      Boolean(projectId) &&
      Boolean(generationId),
    staleTime: 0,
    refetchOnMount: "always",
  });
}
