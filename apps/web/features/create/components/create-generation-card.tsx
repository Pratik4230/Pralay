"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";

import {
  useProjectGeneration,
  useRetryProjectGeneration,
} from "@/features/create/hooks/use-project-generation";
import type { CreateGenerationBlock } from "@/features/create/types/create-ui";
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
  const live = useProjectGeneration(workspaceId, projectId, generation.id, {
    pollWhileActive: true,
  });
  const retry = useRetryProjectGeneration(
    workspaceId,
    projectId,
    generation.id,
  );

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
      <div className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <p>
          {errorMessage ||
            (status === "cancelled"
              ? "Generation was cancelled."
              : "Generation failed. Please try again.")}
        </p>
        {status === "failed" ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={retry.isPending}
            onClick={() => {
              retry.mutate(undefined, {
                onError: (error) => {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not retry generation",
                  );
                },
              });
            }}
          >
            {retry.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RotateCcwIcon />
            )}
            Retry generation
          </Button>
        ) : null}
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
