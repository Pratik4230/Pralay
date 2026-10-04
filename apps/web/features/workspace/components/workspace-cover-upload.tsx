"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";

import {
  useRemoveWorkspaceCover,
  useUploadWorkspaceCover,
} from "@/features/workspace/hooks/use-workspace-cover";
import { validateWorkspaceCoverFile } from "@/features/workspace/utils/upload-workspace-cover";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceCoverUploadProps = {
  workspaceId: string;
  name: string;
  coverImageKey: string | null;
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export function WorkspaceCoverUpload({
  workspaceId,
  name,
  coverImageKey,
}: WorkspaceCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadCover = useUploadWorkspaceCover(workspaceId);
  const removeCover = useRemoveWorkspaceCover(workspaceId);
  const coverUrl = previewUrl ?? getMediaUrl(coverImageKey);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    uploadCover.reset();
    if (!file) return;

    const validationError = validateWorkspaceCoverFile(file);
    if (validationError) {
      setError(validationError);
      clearPreview();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    uploadCover.mutate(
      { file, fileName: file.name.replace(/\.[^.]+$/, "").trim() || "cover" },
      {
        onSuccess: clearPreview,
        onError: (uploadError) =>
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not upload cover image",
          ),
      },
    );
  }

  function handleRemove() {
    setError(null);
    removeCover.mutate(undefined, {
      onError: (removeError) =>
        setError(
          removeError instanceof Error
            ? removeError.message
            : "Could not remove cover image",
        ),
    });
  }

  const isPending = uploadCover.isPending || removeCover.isPending;

  return (
    <Field>
      <FieldLabel>Workspace cover</FieldLabel>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="relative flex h-36 items-center justify-center overflow-hidden bg-linear-to-br from-stone-800 via-stone-700 to-zinc-900 sm:h-44">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`${name} cover`}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-8 text-white/35" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-3">
          <input
            ref={inputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploadCover.isPending
              ? "Uploading..."
              : coverImageKey || previewUrl
                ? "Change cover"
                : "Upload cover"}
          </Button>
          {coverImageKey && !previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={handleRemove}
            >
              {removeCover.isPending ? "Removing..." : "Remove"}
            </Button>
          ) : null}
        </div>
      </div>
      <FieldDescription>JPG, PNG, or WebP up to 10 MB.</FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
