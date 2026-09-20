"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import { WorkspaceOverviewSectionHeader } from "@/features/workspace/components/overview/workspace-overview-section-header";
import { fetchWorkspaceAssetListPage } from "@/features/workspace/utils/fetch-workspace-assets";
import { formatUpdatedAgo } from "@/features/workspace/utils/format-updated-ago";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";
import { getMediaUrl } from "@/global/utils/media-url";

const RECENT_ASSET_LIMIT = 6;

function OverviewAssetThumbnail({
  name,
  s3Key,
  updatedAt,
}: {
  name: string;
  s3Key: string;
  updatedAt: string;
}) {
  const imageUrl = getMediaUrl(s3Key);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="relative aspect-3/4 w-full bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs font-medium text-white">{name}</p>
          <p className="text-[10px] text-white/75">
            {formatUpdatedAgo(updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function OverviewAssetThumbnailSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="aspect-3/4 w-full animate-pulse bg-muted" />
    </div>
  );
}

export function WorkspaceOverviewRecentCreations({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const basePath = getWorkspaceBasePath(workspaceId);
  const { data, isLoading, error } = useQuery({
    queryKey: [...workspaceKeys.assets(workspaceId), "overview-recent", RECENT_ASSET_LIMIT],
    queryFn: () =>
      fetchWorkspaceAssetListPage(workspaceId, { limit: RECENT_ASSET_LIMIT }),
    enabled: Boolean(workspaceId),
  });

  const assets = data?.assets ?? [];

  return (
    <section className="space-y-4">
      <WorkspaceOverviewSectionHeader
        title="Recent creations"
        description="Latest uploads and generated assets from your library."
        href={`${basePath}/library`}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: RECENT_ASSET_LIMIT }).map((_, index) => (
            <OverviewAssetThumbnailSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      {!isLoading && !error && assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-5 py-8 text-center dark:bg-secondary/10">
          <p className="text-sm font-medium">No assets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload references, logos, and creatives to your workspace library.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href={`${basePath}/library`}>Open library</Link>
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && assets.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            assets.length >= 6
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {assets.map((asset) => (
            <OverviewAssetThumbnail
              key={asset.id}
              name={asset.name}
              s3Key={asset.s3Key}
              updatedAt={asset.updatedAt}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
