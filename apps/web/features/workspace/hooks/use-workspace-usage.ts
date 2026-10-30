"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceUsageSummaryResponseSchema } from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";

export function useWorkspaceUsage(workspaceId: string, days = 30) {
  return useQuery({
    queryKey: workspaceKeys.usage(workspaceId, days),
    queryFn: () =>
      fetchApiClient(
        `/api/v1/workspaces/${workspaceId}/usage?days=${days}`,
      ).then((data) => workspaceUsageSummaryResponseSchema.parse(data)),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}
