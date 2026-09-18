"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchWorkspaceAssetListPage,
  WORKSPACE_ASSET_PAGE_SIZE,
} from "@/features/workspace/utils/fetch-workspace-assets";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { uploadWorkspaceAssetFile } from "@/features/workspace/utils/upload-workspace-asset";
import { fetchApiClient } from "@/global/utils/api-client";

export function useInfiniteWorkspaceAssets(
  workspaceId: string,
  limit: number = WORKSPACE_ASSET_PAGE_SIZE,
) {
  return useInfiniteQuery({
    queryKey: workspaceKeys.assetsInfinite(workspaceId, limit),
    queryFn: ({ pageParam }) =>
      fetchWorkspaceAssetListPage(workspaceId, {
        limit,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: Boolean(workspaceId),
  });
}

export function useUploadWorkspaceAsset(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; name: string }) =>
      uploadWorkspaceAssetFile(workspaceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.assets(workspaceId),
      });
    },
  });
}

export function useDeleteWorkspaceAsset(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      fetchApiClient<{ success: true }>(
        `/api/v1/workspaces/${workspaceId}/assets/${assetId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.assets(workspaceId),
      });
    },
  });
}

export function useRenameWorkspaceAsset(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, name }: { assetId: string; name: string }) =>
      fetchApiClient<{ asset: { id: string; name: string } }>(
        `/api/v1/workspaces/${workspaceId}/assets/${assetId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name }),
        },
      ),
    onSuccess: (data) => {
      // Update the name directly in the cached pages — no refetch needed
      queryClient.setQueriesData<{
        pages: Array<{ assets: Array<{ id: string; name: string }> }>;
      }>(
        { queryKey: workspaceKeys.assets(workspaceId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              assets: page.assets.map((a) =>
                a.id === data.asset.id ? { ...a, name: data.asset.name } : a,
              ),
            })),
          };
        },
      );
    },
  });
}
