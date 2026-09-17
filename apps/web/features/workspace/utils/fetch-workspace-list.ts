import type { WorkspaceListResponse } from "@/features/workspace/types";
import { fetchApiClient } from "@/global/utils/api-client";

export const WORKSPACE_LIST_PAGE_SIZE = 20;

export async function fetchWorkspaceListPage(input?: {
  limit?: number;
  cursor?: string | null;
}) {
  const limit = input?.limit ?? WORKSPACE_LIST_PAGE_SIZE;
  const params = new URLSearchParams({ limit: String(limit) });

  if (input?.cursor) {
    params.set("cursor", input.cursor);
  }

  return fetchApiClient<WorkspaceListResponse>(
    `/api/v1/workspaces?${params.toString()}`,
  );
}
