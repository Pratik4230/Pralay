"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";

import type { CreateGenerationBlock } from "@/features/create/types/create-ui";

type CreateGenerationCardProps = {
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
    default:
      return status;
  }
}

export function CreateGenerationCard({ generation }: CreateGenerationCardProps) {
  const isActive =
    generation.status === "queued" || generation.status === "processing";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Generation</span>
        </div>
        <Badge variant={generation.status === "completed" ? "secondary" : "outline"}>
          {isActive ? (
            <span className="inline-flex items-center gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              {statusLabel(generation.status)}
            </span>
          ) : (
            statusLabel(generation.status)
          )}
        </Badge>
      </div>

      <div className="space-y-2 p-3 text-xs">
        <p className="line-clamp-3 text-sm text-foreground">{generation.prompt}</p>
        {generation.referenceNames.length > 0 ? (
          <p className="text-muted-foreground">
            References: {generation.referenceNames.join(", ")}
          </p>
        ) : null}
        <div
          className={cn(
            "flex aspect-video items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-[10px] text-muted-foreground",
            generation.status === "completed" && "border-primary/30 bg-primary/5",
          )}
        >
          {generation.status === "completed"
            ? "Image preview placeholder"
            : "Waiting for output"}
        </div>
      </div>
    </div>
  );
}
