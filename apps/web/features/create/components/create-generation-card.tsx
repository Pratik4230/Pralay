"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@repo/ui/components/badge";
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

function statusLabel(status: CreateGenerationBlock["status"]) {
  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

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
  const prompt = live.data?.generation.prompt ?? generation.prompt;
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

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Generation</span>
        </div>
        <Badge variant={status === "completed" ? "secondary" : "outline"}>
          {isActive ? (
            <span className="inline-flex items-center gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              {statusLabel(status)}
            </span>
          ) : (
            statusLabel(status)
          )}
        </Badge>
      </div>

      <div className="space-y-2 p-3 text-xs">
        <p className="line-clamp-3 text-sm text-foreground">{prompt}</p>
        {generation.referenceNames.length > 0 ? (
          <p className="text-muted-foreground">
            References: {generation.referenceNames.join(", ")}
          </p>
        ) : null}
        {status === "failed" && errorMessage ? (
          <p className="text-destructive">{errorMessage}</p>
        ) : null}
        <div
          className={cn(
            "relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/30 text-[10px] text-muted-foreground",
            status === "completed" &&
              previewUrl &&
              "border-primary/30 bg-primary/5",
          )}
        >
          {status === "completed" && previewUrl ? (
            <Image
              src={previewUrl}
              alt={outputAsset?.name ?? "Generated image"}
              fill
              unoptimized
              className="object-contain"
            />
          ) : isActive ? (
            "Generating image…"
          ) : status === "failed" ? (
            "Generation failed"
          ) : (
            "Waiting for output"
          )}
        </div>
      </div>
    </div>
  );
}
