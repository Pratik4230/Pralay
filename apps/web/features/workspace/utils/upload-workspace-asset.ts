import type { WorkspaceAsset } from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

import {
  runWithConcurrency,
  WORKSPACE_ASSET_UPLOAD_CONCURRENCY,
  type UploadItemStatus,
} from "./run-with-concurrency";

export {
  WORKSPACE_ASSET_UPLOAD_CONCURRENCY,
  type UploadItemStatus,
} from "./run-with-concurrency";

const acceptedAssetTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function defaultAssetFileName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim();
  return baseName.length > 0 ? baseName : "asset";
}

export function validateWorkspaceAssetFile(file: File) {
  if (!acceptedAssetTypes.includes(file.type as (typeof acceptedAssetTypes)[number])) {
    return "Use a JPG, PNG, or WebP image";
  }

  if (file.size > 20 * 1024 * 1024) {
    return "Image must be 20 MB or smaller";
  }

  return null;
}

export async function uploadWorkspaceAssetFile(
  workspaceId: string,
  input: { file: File; name: string },
): Promise<WorkspaceAsset> {
  const { file, name } = input;
  const displayName = name.trim();

  const validationError = validateWorkspaceAssetFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!displayName) {
    throw new Error("Enter a name for this image");
  }

  if (displayName.length > 120) {
    throw new Error("Name must be at most 120 characters");
  }

  const contentType = file.type;
  const upload = await fetchApiClient<{
    assetKey: string;
    uploadUrl: string;
    expiresIn: number;
  }>(`/api/v1/workspaces/${workspaceId}/assets/upload`, {
    method: "POST",
    body: JSON.stringify({
      contentType,
      fileName: displayName,
    }),
  });

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!uploadResponse.ok) {
    const hint =
      uploadResponse.status === 403
        ? "Check IAM (s3:PutObject) on your bucket."
        : uploadResponse.status === 0
          ? "This is often missing S3 CORS for your web app origin."
          : "";
    throw new Error(
      `Failed to upload image to storage (HTTP ${uploadResponse.status}). ${hint}`.trim(),
    );
  }

  const created = await fetchApiClient<{ asset: WorkspaceAsset }>(
    `/api/v1/workspaces/${workspaceId}/assets`,
    {
      method: "POST",
      body: JSON.stringify({
        s3Key: upload.assetKey,
        contentType,
        sizeBytes: file.size,
        name: displayName,
      }),
    },
  );

  return created.asset;
}

export type BatchUploadItem = {
  id: string;
  file: File;
  name: string;
};

export type BatchUploadResult = {
  succeededIds: string[];
  failures: Array<{ id: string; message: string }>;
};

export async function uploadWorkspaceAssetBatch(
  workspaceId: string,
  items: BatchUploadItem[],
  options?: {
    concurrency?: number;
    onItemStatus?: (id: string, status: UploadItemStatus) => void;
    onProgress?: (completed: number, total: number) => void;
  },
): Promise<BatchUploadResult> {
  const concurrency =
    options?.concurrency ?? WORKSPACE_ASSET_UPLOAD_CONCURRENCY;
  const total = items.length;
  let completed = 0;

  const tasks = items.map((item) => async (): Promise<
    | { id: string; ok: true }
    | { id: string; ok: false; message: string }
  > => {
    options?.onItemStatus?.(item.id, "uploading");
    try {
      await uploadWorkspaceAssetFile(workspaceId, {
        file: item.file,
        name: item.name.trim(),
      });
      options?.onItemStatus?.(item.id, "done");
      return { id: item.id, ok: true };
    } catch (error) {
      options?.onItemStatus?.(item.id, "error");
      return {
        id: item.id,
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed",
      };
    } finally {
      completed += 1;
      options?.onProgress?.(completed, total);
    }
  });

  const results = await runWithConcurrency(tasks, concurrency);

  const succeededIds: string[] = [];
  const failures: Array<{ id: string; message: string }> = [];

  for (const result of results) {
    if (result.status === "rejected") {
      failures.push({
        id: "unknown",
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Upload failed",
      });
      continue;
    }

    const value = result.value;
    if (value.ok) {
      succeededIds.push(value.id);
    } else {
      failures.push({ id: value.id, message: value.message });
    }
  }

  return { succeededIds, failures };
}
