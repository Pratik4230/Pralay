import type { WorkspaceAssetListResponse } from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

export const WORKSPACE_ASSET_PAGE_SIZE = 24;

export async function fetchWorkspaceAssetListPage(
  workspaceId: string,
  input?: {
    limit?: number;
    cursor?: string | null;
  },
) {
  const limit = input?.limit ?? WORKSPACE_ASSET_PAGE_SIZE;
  const params = new URLSearchParams({ limit: String(limit) });

  if (input?.cursor) {
    params.set("cursor", input.cursor);
  }

  return fetchApiClient<WorkspaceAssetListResponse>(
    `/api/v1/workspaces/${workspaceId}/assets?${params.toString()}`,
  );
}
