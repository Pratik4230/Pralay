"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { WorkspaceAssetDropzone } from "@/features/workspace/components/workspace-asset-dropzone";
import type { PendingAssetUpload } from "@/features/workspace/utils/workspace-asset-pending";
import { revokePendingAssetUploads } from "@/features/workspace/utils/workspace-asset-pending";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import {
  uploadWorkspaceAssetBatch,
  WORKSPACE_ASSET_UPLOAD_CONCURRENCY,
  type UploadItemStatus,
} from "@/features/workspace/utils/upload-workspace-asset";

type WorkspaceAssetUploadQueueProps = {
  workspaceId: string;
  pending: PendingAssetUpload[];
  onPendingChange: (pending: PendingAssetUpload[]) => void;
  onAddFiles: (files: FileList) => void;
  onUploadComplete?: () => void;
};

function statusLabel(status: UploadItemStatus | undefined) {
  switch (status) {
    case "uploading":
      return "Uploading";
    case "done":
      return "Done";
    case "error":
      return "Failed";
    default:
      return null;
  }
}

export function WorkspaceAssetUploadQueue({
  workspaceId,
  pending,
  onPendingChange,
  onAddFiles,
  onUploadComplete,
}: WorkspaceAssetUploadQueueProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [itemStatus, setItemStatus] = useState<
    Record<string, UploadItemStatus>
  >({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const isUploading = progress !== null;

  function updateName(id: string, name: string) {
    onPendingChange(
      pending.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  function removeItem(id: string) {
    const item = pending.find((entry) => entry.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
    }
    onPendingChange(pending.filter((entry) => entry.id !== id));
    setItemStatus((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setItemErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function clearQueue() {
    if (isUploading) return;
    revokePendingAssetUploads(pending);
    onPendingChange([]);
    setFieldError(null);
    setItemStatus({});
    setItemErrors({});
  }

  async function handleUploadAll() {
    setFieldError(null);
    setItemErrors({});

    if (pending.length === 0) {
      return;
    }

    for (const item of pending) {
      if (!item.name.trim()) {
        const message = "Every image needs a name";
        setFieldError(message);
        toast.error(message);
        return;
      }
      if (item.name.trim().length > 120) {
        const message = "Names must be at most 120 characters";
        setFieldError(message);
        toast.error(message);
        return;
      }
    }

    const initialStatus = Object.fromEntries(
      pending.map((item) => [item.id, "queued" as const]),
    );
    setItemStatus(initialStatus);
    setProgress({ done: 0, total: pending.length });

    const { succeededIds, failures } = await uploadWorkspaceAssetBatch(
      workspaceId,
      pending.map((item) => ({
        id: item.id,
        file: item.file,
        name: item.name,
      })),
      {
        concurrency: WORKSPACE_ASSET_UPLOAD_CONCURRENCY,
        onItemStatus: (id, status) => {
          setItemStatus((current) => ({ ...current, [id]: status }));
        },
        onProgress: (done, total) => {
          setProgress({ done, total });
        },
      },
    );

    setProgress(null);

    if (succeededIds.length > 0) {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.assets(workspaceId),
      });
    }

    const succeededSet = new Set(succeededIds);
    const remaining = pending.filter((item) => {
      if (succeededSet.has(item.id)) {
        URL.revokeObjectURL(item.previewUrl);
        return false;
      }
      return true;
    });

    if (failures.length > 0) {
      const errorMap = Object.fromEntries(
        failures.map((failure) => [failure.id, failure.message]),
      );
      setItemErrors(errorMap);
    }

    onPendingChange(remaining);

    if (failures.length === 0) {
      setItemStatus({});
      toast.success(
        succeededIds.length === 1
          ? "1 image uploaded"
          : `${succeededIds.length} images uploaded`,
      );
      onUploadComplete?.();
    } else if (succeededIds.length === 0) {
      toast.error(`All ${failures.length} uploads failed`);
    } else {
      toast.warning(
        `${succeededIds.length} uploaded, ${failures.length} failed — fix or remove failed items and retry`,
      );
      onUploadComplete?.();
    }
  }

  if (pending.length === 0) {
    return null;
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
      aria-label="Images ready to upload"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">
            Ready to upload ({pending.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Up to {WORKSPACE_ASSET_UPLOAD_CONCURRENCY} files upload at once.
            Newest files appear at the top.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={clearQueue}
          >
            Clear all
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={() => void handleUploadAll()}
          >
            {isUploading
              ? `Uploading ${progress?.done ?? 0} of ${progress?.total ?? pending.length}…`
              : `Upload ${pending.length} ${pending.length === 1 ? "image" : "images"}`}
          </Button>
        </div>
      </div>

      <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
        {pending.map((item, index) => {
          const status = itemStatus[item.id];
          const label = statusLabel(status);
          const rowError = itemErrors[item.id];

          return (
            <li
              key={item.id}
              className="flex gap-3 rounded-lg border border-border/60 bg-background p-3"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={item.previewUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <Field className="min-w-0 flex-1 gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <FieldLabel htmlFor={`${formId}-${item.id}`}>
                    Name · image {index + 1}
                  </FieldLabel>
                  {label ? (
                    <Badge
                      variant={
                        status === "error"
                          ? "destructive"
                          : status === "done"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {label}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id={`${formId}-${item.id}`}
                  value={item.name}
                  onChange={(event) => updateName(item.id, event.target.value)}
                  disabled={isUploading}
                  maxLength={120}
                />
                <FieldDescription className="truncate">
                  {item.file.name} · {(item.file.size / 1024).toFixed(0)} KB
                </FieldDescription>
                {rowError ? (
                  <FieldError className="text-xs">{rowError}</FieldError>
                ) : null}
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 self-start"
                disabled={isUploading}
                onClick={() => removeItem(item.id)}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ul>

      {fieldError ? <FieldError>{fieldError}</FieldError> : null}

      <WorkspaceAssetDropzone
        compact
        disabled={isUploading}
        onFiles={onAddFiles}
      />
    </section>
  );
}
