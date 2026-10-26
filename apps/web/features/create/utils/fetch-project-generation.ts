import {
  getProjectGenerationResponseSchema,
  retryProjectGenerationResponseSchema,
  type Generation,
} from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

export function fetchProjectGeneration(
  workspaceId: string,
  projectId: string,
  generationId: string,
): Promise<{ generation: Generation }> {
  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/generations/${generationId}`,
  ).then((data) => getProjectGenerationResponseSchema.parse(data));
}

export function retryProjectGeneration(
  workspaceId: string,
  projectId: string,
  generationId: string,
): Promise<{ generation: Generation }> {
  return fetchApiClient(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/generations/${generationId}/retry`,
    { method: "POST" },
  ).then((data) => retryProjectGenerationResponseSchema.parse(data));
}
