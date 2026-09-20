import type {
  AssetScopeFilter,
  WorkspaceAssetListResponse,
} from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

export const WORKSPACE_ASSET_PAGE_SIZE = 24;

export type FetchWorkspaceAssetsInput = {
  limit?: number;
  cursor?: string | null;
  scope?: AssetScopeFilter;
  projectId?: string;
};

export async function fetchWorkspaceAssetListPage(
  workspaceId: string,
  input?: FetchWorkspaceAssetsInput,
) {
  const limit = input?.limit ?? WORKSPACE_ASSET_PAGE_SIZE;
  const scope = input?.scope ?? "workspace";
  const params = new URLSearchParams({
    limit: String(limit),
    scope,
  });

  if (input?.cursor) {
    params.set("cursor", input.cursor);
  }

  if (scope === "project" && input?.projectId) {
    params.set("projectId", input.projectId);
  }

  return fetchApiClient<WorkspaceAssetListResponse>(
    `/api/v1/workspaces/${workspaceId}/assets?${params.toString()}`,
  );
}
