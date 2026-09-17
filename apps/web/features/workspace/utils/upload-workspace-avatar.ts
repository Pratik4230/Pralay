import type { WorkspaceResponse } from "@/features/workspace/types";
import { fetchApiClient } from "@/global/utils/api-client";

const acceptedAvatarTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function defaultAvatarFileName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim();
  return baseName.length > 0 ? baseName : "avatar";
}

export function validateWorkspaceAvatarFile(file: File) {
  if (!acceptedAvatarTypes.includes(file.type as (typeof acceptedAvatarTypes)[number])) {
    return "Use a JPG, PNG, or WebP image";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "Image must be 5 MB or smaller";
  }

  return null;
}

export async function uploadWorkspaceAvatarFile(
  workspaceId: string,
  file: File,
  fileName?: string,
): Promise<WorkspaceResponse> {
  const validationError = validateWorkspaceAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const contentType = file.type;
  const upload = await fetchApiClient<{
    avatarKey: string;
    uploadUrl: string;
    expiresIn: number;
  }>(`/api/v1/workspaces/${workspaceId}/avatar/upload`, {
    method: "POST",
    body: JSON.stringify({
      contentType,
      ...(fileName?.trim() ? { fileName: fileName.trim() } : {}),
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
          ? "This is often missing S3 CORS for your web app origin (e.g. http://localhost:3000)."
          : "";
    throw new Error(
      `Failed to upload image to storage (HTTP ${uploadResponse.status}). ${hint}`.trim(),
    );
  }

  return fetchApiClient<WorkspaceResponse>(
    `/api/v1/workspaces/${workspaceId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ avatarKey: upload.avatarKey }),
    },
  );
}
