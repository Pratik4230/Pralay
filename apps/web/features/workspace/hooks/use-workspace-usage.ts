"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  updateWorkspaceUsageBudgetBodySchema,
  updateProjectAiBudgetBodySchema,
  projectAiBudgetResponseSchema,
  adjustWorkspaceCreditsBodySchema,
  workspaceCreditAdjustmentResponseSchema,
  workspaceUsageBudgetResponseSchema,
  workspaceUsageSummaryResponseSchema,
} from "@repo/validators";

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

export function useUpdateProjectAiBudget(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; monthlyLimit: number | null }) =>
      fetchApiClient(
        `/api/v1/workspaces/${workspaceId}/usage/projects/${input.projectId}/budget`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            updateProjectAiBudgetBodySchema.parse({
              monthlyLimit: input.monthlyLimit,
            }),
          ),
        },
      ).then((data) => projectAiBudgetResponseSchema.parse(data)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.usageRoot(workspaceId),
      }),
  });
}

export function useAdjustWorkspaceCredits(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      idempotencyKey: string;
      creditsDelta: number;
      reason: string;
    }) =>
      fetchApiClient(
        `/api/v1/workspaces/${workspaceId}/usage/credits/adjustments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adjustWorkspaceCreditsBodySchema.parse(input)),
        },
      ).then((data) => workspaceCreditAdjustmentResponseSchema.parse(data)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.usageRoot(workspaceId),
      }),
  });
}

export function useUpdateWorkspaceUsageBudget(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { lowCreditThreshold: number }) =>
      fetchApiClient(`/api/v1/workspaces/${workspaceId}/usage/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateWorkspaceUsageBudgetBodySchema.parse(input)),
      }).then((data) => workspaceUsageBudgetResponseSchema.parse(data)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.usageRoot(workspaceId),
      }),
  });
}
