"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

import { WorkspaceAssetDropzone } from "@/features/workspace/components/workspace-asset-dropzone";
import { WorkspaceAssetUploadQueue } from "@/features/workspace/components/workspace-asset-upload-queue";
import { WorkspaceCardSkeleton } from "@/features/workspace/components/workspace-card";
import {
  useInfiniteWorkspaceAssets,
  useRenameWorkspaceAsset,
} from "@/features/workspace/hooks/use-workspace-assets";
import { useInfiniteScrollSentinel } from "@/features/workspace/hooks/use-infinite-scroll-sentinel";
import type { WorkspaceAsset } from "@/features/workspace/types";
import {
  mergePendingAssetUploads,
  type PendingAssetUpload,
} from "@/features/workspace/utils/workspace-asset-pending";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";
import { getMediaUrl } from "@/global/utils/media-url";
import { fetchApiClient } from "@/global/utils/api-client";

type WorkspaceAssetsPanelProps = {
  workspaceId: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Asset Tile ───────────────────────────────────────────────────────────────

function AssetTile({
  asset,
  isSelected,
  isAnySelected,
  onToggle,
  onRename,
}: {
  asset: WorkspaceAsset;
  isSelected: boolean;
  isAnySelected: boolean;
  onToggle: () => void;
  onRename: (assetId: string, newName: string) => Promise<void>;
}) {
  const imageUrl = getMediaUrl(asset.s3Key);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(asset.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation(); // don't toggle selection
    setEditValue(asset.name);
    setIsEditing(true);
    // focus after render
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === asset.name) {
      setIsEditing(false);
      return;
    }
    if (trimmed.length > 120) {
      toast.error("Name must be at most 120 characters");
      return;
    }
    setIsSaving(true);
    try {
      await onRename(asset.id, trimmed);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }

  function cancelEdit() {
    setEditValue(asset.name);
    setIsEditing(false);
  }

  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Select ${asset.name}`}
      tabIndex={isEditing ? -1 : 0}
      onClick={isEditing ? undefined : onToggle}
      onKeyDown={(e) => {
        if (isEditing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isEditing
          ? "cursor-default border-primary/60"
          : isSelected
            ? "border-primary ring-2 ring-primary ring-offset-1"
            : "border-border/60 hover:border-primary/40",
      )}
    >
      {/* Checkbox overlay — hidden during editing */}
      {!isEditing ? (
        <div
          className={cn(
            "absolute left-3 top-3 z-10 flex size-5 items-center justify-center rounded-md border-2 transition-all",
            isSelected
              ? "border-primary bg-primary"
              : cn(
                  "border-white/80 bg-black/30 backdrop-blur-sm",
                  isAnySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                ),
          )}
          aria-hidden
        >
          {isSelected ? (
            <CheckIcon className="size-3 text-primary-foreground" strokeWidth={3} />
          ) : null}
        </div>
      ) : null}

      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={asset.name}
            fill
            unoptimized
            className={cn(
              "object-cover transition-opacity",
              isSelected && "opacity-80",
            )}
          />
        ) : null}
      </div>

      {/* Info */}
      <div className="min-w-0 px-1 pb-1" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={isSaving}
            maxLength={120}
            autoFocus
            className={cn(
              "w-full rounded-md border border-primary/60 bg-background px-2 py-0.5 text-sm font-medium outline-none ring-1 ring-primary/40 transition-opacity",
              isSaving && "opacity-50",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitEdit();
              }
              if (e.key === "Escape") {
                cancelEdit();
              }
            }}
            onBlur={() => void commitEdit()}
            aria-label="Asset name"
          />
        ) : (
          // Tooltip wrapper — pure CSS, no extra dependency
          <div className="group/tip relative">
            <p
              className="cursor-text truncate text-sm font-medium select-none"
              onDoubleClick={startEdit}
              title="" // suppress native tooltip
              aria-label={`${asset.name} — double-click to rename`}
            >
              {asset.name}
            </p>
            {/* Tooltip bubble */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md ring-1 ring-border/40 opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100"
            >
              Double-click to rename
            </span>
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatBytes(asset.sizeBytes)}
        </p>
      </div>
    </div>
  );
}

// ─── Selection Toolbar ────────────────────────────────────────────────────────

function SelectionToolbar({
  selectedCount,
  totalCount,
  isDeleting,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
}: {
  selectedCount: number;
  totalCount: number;
  isDeleting: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-primary">
          {selectedCount} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={allSelected ? onClearSelection : onSelectAll}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isDeleting || selectedCount === 0}
        onClick={onDeleteSelected}
        className="gap-1.5"
      >
        <Trash2Icon className="size-3.5" />
        {isDeleting
          ? "Deleting…"
          : `Delete ${selectedCount} ${selectedCount === 1 ? "image" : "images"}`}
      </Button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function WorkspaceAssetsPanel({ workspaceId }: WorkspaceAssetsPanelProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingAssetUpload[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const assetsQuery = useInfiniteWorkspaceAssets(workspaceId);
  const renameAsset = useRenameWorkspaceAsset(workspaceId);

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
  const isAnySelected = selectedIds.size > 0;

  function handleAddFiles(files: FileList) {
    const { pending, errors } = mergePendingAssetUploads(pendingUploads, files);
    if (errors.length > 0) toast.error(errors.join(" · "));
    if (pending.length === pendingUploads.length) return;
    setPendingUploads(pending);
  }

  function toggleAsset(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(assets.map((a) => a.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleRename(assetId: string, newName: string) {
    try {
      await renameAsset.mutateAsync({ assetId, name: newName });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not rename asset",
      );
      throw error; // re-throw so the tile can stay in edit mode
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);

    const ids = Array.from(selectedIds);

    try {
      // Single HTTP request → 1 DB query + parallel S3 deletes on the server
      const result = await fetchApiClient<{ deleted: string[]; failed: string[] }>(
        `/api/v1/workspaces/${workspaceId}/assets`,
        {
          method: "DELETE",
          body: JSON.stringify({ ids }),
        },
      );

      const succeeded = result.deleted.length;
      const failed = result.failed.length;

      // Keep only the IDs that the server could not delete selected
      setSelectedIds(new Set(result.failed));
      void assetsQuery.refetch();

      if (failed === 0) {
        toast.success(
          succeeded === 1 ? "1 image deleted" : `${succeeded} images deleted`,
        );
      } else if (succeeded === 0) {
        toast.error(`Failed to delete ${failed} ${failed === 1 ? "image" : "images"}`);
      } else {
        toast.warning(
          `${succeeded} deleted, ${failed} failed — failed items remain selected`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete assets",
      );
    } finally {
      setIsBulkDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const deleteConfirmDescription =
    selectedIds.size === 1
      ? `"${assets.find((a) => selectedIds.has(a.id))?.name ?? "this image"}" will be permanently deleted from storage. This cannot be undone.`
      : `${selectedIds.size} images will be permanently deleted from storage. This cannot be undone.`;

  return (
    <>
      <ConfirmAlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) setShowDeleteConfirm(false);
        }}
        title={
          selectedIds.size === 1
            ? "Delete image?"
            : `Delete ${selectedIds.size} images?`
        }
        description={deleteConfirmDescription}
        confirmLabel={selectedIds.size === 1 ? "Delete" : `Delete ${selectedIds.size}`}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Asset library</CardTitle>
          <CardDescription>
            Drag images in or browse · hover an image name to rename · click to select
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

          {/* Selection toolbar — visible when at least one asset is selected */}
          {isAnySelected ? (
            <SelectionToolbar
              selectedCount={selectedIds.size}
              totalCount={assets.length}
              isDeleting={isBulkDeleting}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onDeleteSelected={() => setShowDeleteConfirm(true)}
            />
          ) : null}

          {assetsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <WorkspaceCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {assetsQuery.error ? (
            <p className="text-sm text-destructive">{assetsQuery.error.message}</p>
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
                {isAnySelected ? null : (
                  <span className="ml-2 text-xs font-normal">
                    · click to select
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {assets.map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    isSelected={selectedIds.has(asset.id)}
                    isAnySelected={isAnySelected}
                    onToggle={() => toggleAsset(asset.id)}
                    onRename={handleRename}
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
