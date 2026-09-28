"use client";

import { useQuery } from "@tanstack/react-query";

import type { Generation } from "@repo/validators";

import { CREATE_GENERATION_POLL_MS } from "@/features/create/constants/create-timing";
import { fetchProjectGeneration } from "@/features/create/utils/fetch-project-generation";
import { createKeys } from "@/features/create/utils/query-keys";

function isGenerationActive(status: Generation["status"]) {
  return status === "queued" || status === "processing";
}

export function useProjectGeneration(
  workspaceId: string,
  projectId: string,
  generationId: string | null | undefined,
) {
  return useQuery({
    queryKey: createKeys.generation(
      workspaceId,
      projectId,
      generationId ?? "none",
    ),
    queryFn: () =>
      fetchProjectGeneration(workspaceId, projectId, generationId!),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(generationId),
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
