import type { WorkspaceResponse } from "@/features/workspace/types";
import { fetchApiClient } from "@/global/utils/api-client";

const acceptedCoverTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateWorkspaceCoverFile(file: File) {
  if (
    !acceptedCoverTypes.includes(
      file.type as (typeof acceptedCoverTypes)[number],
    )
  ) {
    return "Use a JPG, PNG, or WebP image";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "Cover image must be 10 MB or smaller";
  }
  return null;
}

export async function uploadWorkspaceCoverFile(
  workspaceId: string,
  file: File,
  fileName?: string,
): Promise<WorkspaceResponse> {
  const validationError = validateWorkspaceCoverFile(file);
  if (validationError) throw new Error(validationError);

  const contentType = file.type;

  const upload = await fetchApiClient<{
    coverImageKey: string;
    uploadUrl: string;
    expiresIn: number;
  }>(`/api/v1/workspaces/${workspaceId}/cover/upload`, {
    method: "POST",
    body: JSON.stringify({
      contentType,
      ...(fileName?.trim() ? { fileName: fileName.trim() } : {}),
    }),
  });

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload cover image (HTTP ${uploadResponse.status})`,
    );
  }

  // Persist the key by PATCHing the workspace
  return fetchApiClient<WorkspaceResponse>(
    `/api/v1/workspaces/${workspaceId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ coverImageKey: upload.coverImageKey }),
    },
  );
}
