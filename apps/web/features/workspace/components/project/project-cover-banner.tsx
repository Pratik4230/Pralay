"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import {
  uploadProjectCoverFile,
  useUpdateWorkspaceProject,
} from "@/features/workspace/hooks/use-workspace-projects";
import { getMediaUrl } from "@/global/utils/media-url";

type ProjectCoverBannerProps = {
  workspaceId: string;
  projectId: string;
  name: string;
  coverKey: string | null;
  variant?: "card" | "hero";
};

export function ProjectCoverBanner({
  workspaceId,
  projectId,
  name,
  coverKey,
  variant = "card",
}: ProjectCoverBannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const update = useUpdateWorkspaceProject(workspaceId, projectId);
  const imageUrl = getMediaUrl(coverKey);

  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const newCoverKey = await uploadProjectCoverFile(
        workspaceId,
        projectId,
        file,
      );
      await update.mutateAsync({ coverKey: newCoverKey });
      toast.success("Cover updated");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemoveCover() {
    try {
      await update.mutateAsync({ coverKey: null });
      toast.success("Cover removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove cover",
      );
    }
  }

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "relative w-full overflow-hidden",
          variant === "hero"
            ? "h-52 sm:h-60"
            : "h-44 rounded-xl",
          !imageUrl && `bg-linear-to-br ${colors[colorIdx]}`,
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} cover`}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span
              className={cn(
                "font-bold text-white/20 select-none",
                variant === "hero" ? "text-6xl" : "text-5xl",
              )}
            >
              {name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
          </div>
        )}

        {variant === "hero" ? (
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/10" />
        ) : null}

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-xs backdrop-blur-sm bg-black/30 text-white border-white/20 hover:bg-black/50"
            disabled={uploading || update.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : coverKey ? "Change cover" : "Add cover"}
          </Button>
          {coverKey ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs backdrop-blur-sm bg-black/30 text-white border-white/20 hover:bg-black/50"
              disabled={uploading || update.isPending}
              onClick={handleRemoveCover}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {uploadError ? (
        <p className="mt-1 text-xs text-destructive">{uploadError}</p>
      ) : null}
    </div>
  );
}
