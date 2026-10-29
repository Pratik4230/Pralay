"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Loader2Icon,
  Maximize2Icon,
  RotateCcwIcon,
  PencilIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";

import {
  useProjectGeneration,
  useRetryProjectGeneration,
} from "@/features/create/hooks/use-project-generation";
import type { CreateGenerationBlock } from "@/features/create/types/create-ui";
import { CreateImageEditorDialog } from "@/features/create/components/create-image-editor-dialog";
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTool, setEditorTool] = useState<"edit" | "resize">("edit");
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
  const type = live.data?.generation.type ?? generation.type;
  const parentGenerationId =
    live.data?.generation.parentGenerationId ?? generation.parentGenerationId;
  const errorMessage =
    live.data?.generation.errorMessage ?? generation.errorMessage;
  const outputAsset =
    live.data?.generation.outputAssets[0] ??
    generation.outputAssets?.[0] ??
    null;

  const isActive = status === "queued" || status === "processing";
  const events = live.data?.generation.events ?? [];
  const retryCount = live.data?.generation.retryCount ?? 0;
  const timeline =
    events.length > 0 ? (
      <details className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Job details</summary>
        <ol className="mt-2 space-y-1 pl-4">
          {events.map((event) => (
            <li key={event.id} className="list-disc">
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)} at{" "}
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
        {retryCount > 0 ? (
          <p className="mt-2">Automatic retries: {retryCount}</p>
        ) : null}
      </details>
    ) : null;

  useEffect(() => {
    if (status !== "completed" || !outputAsset) return;
    void queryClient.invalidateQueries({
      queryKey: workspaceKeys.assets(workspaceId),
    });
  }, [outputAsset, queryClient, status, workspaceId]);

  const previewUrl = outputAsset ? getMediaUrl(outputAsset.s3Key) : null;
  const label =
    type === "resize"
      ? "Resize"
      : type === "edit" || type === "variation"
        ? "Edit"
        : "Image";

  if (status === "completed" && previewUrl) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
          <span>{label}</span>
          <span>
            {outputAsset?.width && outputAsset?.height
              ? `${outputAsset.width} × ${outputAsset.height} px`
              : parentGenerationId
                ? "Based on an earlier image"
                : null}
          </span>
        </div>
        <button
          type="button"
          className="relative block aspect-video w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${label.toLowerCase()} details`}
          onClick={() => {
            setEditorTool("edit");
            setEditorOpen(true);
          }}
        >
          <Image
            src={previewUrl}
            alt={outputAsset?.name ?? "Generated image"}
            fill
            unoptimized
            className="object-contain"
          />
        </button>
        <div className="flex gap-2 border-t border-border/60 p-2">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setEditorTool("edit");
              setEditorOpen(true);
            }}
          >
            <PencilIcon /> Edit
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setEditorTool("resize");
              setEditorOpen(true);
            }}
          >
            <Maximize2Icon /> Resize
          </Button>
        </div>
        {timeline}
        {outputAsset && (
          <CreateImageEditorDialog
            open={editorOpen}
            onOpenChange={setEditorOpen}
            generation={live.data?.generation}
            outputAsset={outputAsset}
            type={type}
            initialTool={editorTool}
          />
        )}
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
        {timeline}
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm">
      <div
        className={cn(
          "relative flex aspect-video items-center justify-center text-xs text-muted-foreground",
          !isActive && "border-dashed",
        )}
      >
        {isActive ? (
          <span className="inline-flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            {status === "queued"
              ? "Queued..."
              : type === "resize"
                ? "Resizing..."
                : type === "edit" || type === "variation"
                  ? "Editing..."
                  : "Generating..."}
          </span>
        ) : (
          "Waiting for output"
        )}
      </div>
      {timeline}
    </div>
  );
}
