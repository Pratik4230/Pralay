"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, UploadIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

const accept = "image/jpeg,image/png,image/webp";

type WorkspaceAssetDropzoneProps = {
  disabled?: boolean;
  compact?: boolean;
  onFiles: (files: FileList) => void;
};

export function WorkspaceAssetDropzone({
  disabled = false,
  compact = false,
  onFiles,
}: WorkspaceAssetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function pickFiles() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.length) {
      onFiles(files);
    }
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled || !event.dataTransfer.files.length) return;
    onFiles(event.dataTransfer.files);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pickFiles();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={pickFiles}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        disabled && "pointer-events-none opacity-50",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border/80 bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-background shadow-sm",
          compact ? "size-10" : "size-12",
        )}
      >
        {isDragging ? (
          <UploadIcon className="size-5 text-primary" aria-hidden />
        ) : (
          <ImagePlusIcon className="size-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-1">
        <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>
          {isDragging ? "Drop images here" : "Drag and drop images here"}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse · JPG, PNG, WebP · 20 MB each · multiple files
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-1"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          pickFiles();
        }}
      >
        Choose files
      </Button>
    </div>
  );
}
