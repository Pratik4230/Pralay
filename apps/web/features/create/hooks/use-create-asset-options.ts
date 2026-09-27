"use client";

import { useMemo } from "react";

import type { WorkspaceAsset } from "@repo/validators";

import type { CreateAttachedAsset } from "@/features/create/types/create-ui";
import { useInfiniteWorkspaceAssets } from "@/features/workspace/hooks/use-workspace-assets";

export type CreateAssetOption = CreateAttachedAsset & {
  category: string;
};

export function useCreateAssetOptions(
  workspaceId: string,
  projectId: string,
) {
  const projectQuery = useInfiniteWorkspaceAssets(workspaceId, {
    scope: "project",
    projectId,
    limit: 48,
  });
  const workspaceQuery = useInfiniteWorkspaceAssets(workspaceId, {
    scope: "workspace",
    limit: 48,
  });

  const options = useMemo(() => {
    const projectAssets =
      projectQuery.data?.pages.flatMap((page) => page.assets) ?? [];
    const workspaceAssets =
      workspaceQuery.data?.pages.flatMap((page) => page.assets) ?? [];

    const mapAsset = (
      asset: WorkspaceAsset,
      scope: "project" | "workspace",
    ): CreateAssetOption => ({
      id: asset.id,
      name: asset.name,
      s3Key: asset.s3Key,
      scope,
      category: asset.category,
    });

    return [
      ...projectAssets.map((asset) => mapAsset(asset, "project")),
      ...workspaceAssets.map((asset) => mapAsset(asset, "workspace")),
    ];
  }, [projectQuery.data, workspaceQuery.data]);

  const isLoading = projectQuery.isLoading || workspaceQuery.isLoading;

  return { options, isLoading };
}

export function filterCreateAssetOptions(
  options: CreateAssetOption[],
  query: string,
  limit = 8,
) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return options.slice(0, limit);
  }

  return options
    .filter((option) => option.name.toLowerCase().includes(q))
    .slice(0, limit);
}
