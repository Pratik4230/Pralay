import type { QueryClient } from "@tanstack/react-query";

import type { WorkspaceAsset } from "@repo/validators";

import { workspaceKeys } from "@/features/workspace/utils/query-keys";

type InfiniteAssetCache = {
  pages: Array<{ assets: WorkspaceAsset[] }>;
};

export function findCachedWorkspaceAsset(
  queryClient: QueryClient,
  workspaceId: string,
  assetId: string,
): WorkspaceAsset | undefined {
  const entries = queryClient.getQueriesData<InfiniteAssetCache>({
    queryKey: workspaceKeys.assets(workspaceId),
  });

  for (const [, data] of entries) {
    if (!data?.pages) continue;
    for (const page of data.pages) {
      const match = page.assets.find((asset) => asset.id === assetId);
      if (match) return match;
    }
  }

  return undefined;
}
