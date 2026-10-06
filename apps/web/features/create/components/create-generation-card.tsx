"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Loader2Icon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@repo/ui/lib/utils";

import { useProjectGeneration } from "@/features/create/hooks/use-project-generation";
import type { CreateGenerationBlock } from "@/features/create/types/create-ui";
import { isActiveGenerationStatus } from "@/features/create/utils/map-generation-summary";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { getMediaUrl } from "@/global/utils/media-url";

type CreateGenerationCardProps = {
  workspaceId: string;
  projectId: string;
  generation: CreateGenerationBlock;
};

export function CreateGenerationCard({
  workspaceId,
  projectId,
  generation,
}: CreateGenerationCardProps) {
  const queryClient = useQueryClient();
  const shouldPoll = isActiveGenerationStatus(generation.status);
  const live = useProjectGeneration(workspaceId, projectId, generation.id, {
    pollWhileActive: shouldPoll,
  });

  const status = (live.data?.generation.status ??
    generation.status) as CreateGenerationBlock["status"];
  const errorMessage =
    live.data?.generation.errorMessage ?? generation.errorMessage;
  const outputAsset =
    live.data?.generation.outputAssets[0] ??
    generation.outputAssets?.[0] ??
    null;

  const isActive = status === "queued" || status === "processing";

  useEffect(() => {
    if (status !== "completed" || !outputAsset) return;
    void queryClient.invalidateQueries({
      queryKey: workspaceKeys.assets(workspaceId),
    });
  }, [outputAsset, queryClient, status, workspaceId]);

  const previewUrl = outputAsset ? getMediaUrl(outputAsset.s3Key) : null;

  if (status === "completed" && previewUrl) {
    return (
      <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-muted/30 shadow-sm">
        <Image
          src={previewUrl}
          alt={outputAsset?.name ?? "Generated image"}
          fill
          unoptimized
          className="object-contain"
        />
      </div>
    );
  }

  if (status === "failed" || status === "cancelled") {
    return (
      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {errorMessage ||
          (status === "cancelled"
            ? "Generation was cancelled."
            : "Generation failed. Please try again.")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mt-3 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 text-xs text-muted-foreground shadow-sm",
        !isActive && "border-dashed",
      )}
    >
      {isActive ? (
        <span className="inline-flex items-center gap-2">
          <Loader2Icon className="size-4 animate-spin" />
          Generating...
        </span>
      ) : (
        "Waiting for output"
      )}
    </div>
  );
}
