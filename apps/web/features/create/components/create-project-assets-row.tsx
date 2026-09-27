"use client";

import Image from "next/image";
import Link from "next/link";
import { MoreHorizontalIcon, UploadIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import type { CreateAssetOption } from "@/features/create/hooks/use-create-asset-options";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";
import { getMediaUrl } from "@/global/utils/media-url";

type CreateProjectAssetsRowProps = {
  workspaceId: string;
  projectId: string;
  options: CreateAssetOption[];
  selectedIds: string[];
  onToggle: (assetId: string) => void;
  isLoading?: boolean;
};

export function CreateProjectAssetsRow({
  workspaceId,
  projectId,
  options,
  selectedIds,
  onToggle,
  isLoading,
}: CreateProjectAssetsRowProps) {
  const projectAssets = options.filter((option) => option.scope === "project");
  const assetsPath = `${getProjectBasePath(workspaceId, projectId)}/assets`;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Your project assets</h2>
        <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
          <Link href={assetsPath}>View all</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading assets…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Link
            href={assetsPath}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <UploadIcon className="size-5" />
            Upload new
          </Link>

          {projectAssets.slice(0, 11).map((asset) => {
            const selected = selectedIds.includes(asset.id);
            const url = getMediaUrl(asset.s3Key);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onToggle(asset.id)}
                className={cn(
                  "overflow-hidden rounded-xl border text-left transition-colors",
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/60 hover:border-primary/30",
                )}
              >
                <div className="relative aspect-square bg-muted">
                  {url ? (
                    <Image
                      src={url}
                      alt={asset.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] font-medium">
                  {asset.name}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
