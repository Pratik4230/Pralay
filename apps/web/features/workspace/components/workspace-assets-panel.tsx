"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { WorkspaceAssetDropzone } from "@/features/workspace/components/workspace-asset-dropzone";
import { WorkspaceAssetUploadQueue } from "@/features/workspace/components/workspace-asset-upload-queue";
import { WorkspaceCardSkeleton } from "@/features/workspace/components/workspace-card";
import {
  useDeleteWorkspaceAsset,
  useInfiniteWorkspaceAssets,
} from "@/features/workspace/hooks/use-workspace-assets";
import { useInfiniteScrollSentinel } from "@/features/workspace/hooks/use-infinite-scroll-sentinel";
import type { WorkspaceAsset } from "@/features/workspace/types";
import {
  mergePendingAssetUploads,
  type PendingAssetUpload,
} from "@/features/workspace/utils/workspace-asset-pending";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceAssetsPanelProps = {
  workspaceId: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetTile({
  asset,
  onDelete,
  isDeleting,
}: {
  asset: WorkspaceAsset;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const imageUrl = getMediaUrl(asset.s3Key);

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={asset.name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 px-1 pb-1">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(asset.sizeBytes)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? "Removing..." : "Remove"}
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceAssetsPanel({
  workspaceId,
}: WorkspaceAssetsPanelProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingAssetUpload[]>(
    [],
  );
  const [assetToDelete, setAssetToDelete] = useState<WorkspaceAsset | null>(
    null,
  );

  const assetsQuery = useInfiniteWorkspaceAssets(workspaceId);
  const deleteAsset = useDeleteWorkspaceAsset(workspaceId);

  const assets = assetsQuery.data?.pages.flatMap((page) => page.assets) ?? [];

  const loadMore = useCallback(() => {
    if (assetsQuery.hasNextPage && !assetsQuery.isFetchingNextPage) {
      void assetsQuery.fetchNextPage();
    }
  }, [assetsQuery]);

  const sentinelRef = useInfiniteScrollSentinel({
    enabled: Boolean(assetsQuery.hasNextPage),
    onLoadMore: loadMore,
  });

  const hasPending = pendingUploads.length > 0;

  function handleAddFiles(files: FileList) {
    const { pending, errors } = mergePendingAssetUploads(pendingUploads, files);

    if (errors.length > 0) {
      toast.error(errors.join(" · "));
    }

    if (pending.length === pendingUploads.length) {
      return;
    }

    setPendingUploads(pending);
  }

  async function confirmRemoveAsset() {
    if (!assetToDelete) return;

    try {
      await deleteAsset.mutateAsync(assetToDelete.id);
      toast.success(`Removed “${assetToDelete.name}” from the library`);
      setAssetToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove asset",
      );
    }
  }

  return (
    <>
      <ConfirmAlertDialog
        open={assetToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteAsset.isPending) {
            setAssetToDelete(null);
          }
        }}
        title="Remove asset?"
        description={
          assetToDelete
            ? `“${assetToDelete.name}” will be deleted from storage and removed from this workspace library. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        isLoading={deleteAsset.isPending}
        onConfirm={confirmRemoveAsset}
      />
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Asset library</CardTitle>
          <CardDescription>
            Drag images in or browse. Add several at once, name them, then
            upload once. Same pattern as Drive or Figma media panels.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <WorkspaceAssetUploadQueue
            workspaceId={workspaceId}
            pending={pendingUploads}
            onPendingChange={setPendingUploads}
            onAddFiles={handleAddFiles}
            onUploadComplete={() => {}}
          />

          {!hasPending ? (
            <WorkspaceAssetDropzone onFiles={handleAddFiles} />
          ) : null}

          {assetsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <WorkspaceCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {assetsQuery.error ? (
            <p className="text-sm text-destructive">
              {assetsQuery.error.message}
            </p>
          ) : null}

          {!assetsQuery.isLoading &&
          !assetsQuery.error &&
          assets.length === 0 &&
          !hasPending ? (
            <p className="text-center text-sm text-muted-foreground">
              Your uploaded assets will appear below the drop zone.
            </p>
          ) : null}

          {assets.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                In library ({assets.length}
                {assetsQuery.hasNextPage ? "+" : ""})
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {assets.map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    isDeleting={
                      deleteAsset.isPending &&
                      deleteAsset.variables === asset.id
                    }
                    onDelete={() => setAssetToDelete(asset)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

          {assetsQuery.isFetchingNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              Loading more...
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
