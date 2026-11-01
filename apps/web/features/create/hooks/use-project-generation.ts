"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  generationRealtimeEventSchema,
  type Generation,
} from "@repo/validators";

import {
  fetchProjectGenerationHistory,
  fetchProjectGeneration,
  retryProjectGeneration,
} from "@/features/create/utils/fetch-project-generation";
import { createKeys } from "@/features/create/utils/query-keys";
import { useInngestRealtimeSubscription } from "@/global/hooks/use-inngest-realtime-subscription";

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
) {
  const queryClient = useQueryClient();
  const queryKey = createKeys.generation(
    workspaceId,
    projectId,
    generationId ?? "none",
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchProjectGeneration(workspaceId, projectId, generationId!),
    enabled:
      Boolean(workspaceId) && Boolean(projectId) && Boolean(generationId),
  });

  const handleRealtimeMessage = useCallback(
    (data: unknown) => {
      const event = generationRealtimeEventSchema.safeParse(data);
      if (!event.success) return;
      queryClient.setQueryData(queryKey, {
        generation: event.data.generation,
      });
    },
    [queryClient, workspaceId, projectId, generationId],
  );
  const reconcileAfterConnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, workspaceId, projectId, generationId]);

  const status = query.data?.generation.status;
  useInngestRealtimeSubscription({
    enabled:
      Boolean(generationId) && Boolean(status && isGenerationActive(status)),
    tokenUrl: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/generations/${generationId ?? "none"}/realtime-token`,
    onMessage: handleRealtimeMessage,
    onConnected: reconcileAfterConnect,
  });

  return query;
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
