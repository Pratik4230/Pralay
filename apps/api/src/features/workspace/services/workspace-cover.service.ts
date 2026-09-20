import {
  buildWorkspaceCoverKey,
  createPresignedUploadUrl,
  isStorageConfigured,
} from "@repo/storage";

import {
  requireWorkspaceAdmin,
  WorkspaceAccessError,
} from "./workspace-access.service.js";
import { StorageNotConfiguredError } from "./workspace-avatar.service.js";

export async function createWorkspaceCoverUpload(
  actorUserId: string,
  workspaceId: string,
  contentType: string,
  fileName?: string,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const coverImageKey = buildWorkspaceCoverKey(workspaceId, contentType, fileName);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
    key: coverImageKey,
    contentType,
  });

  return { coverImageKey, uploadUrl, expiresIn };
}

export { WorkspaceAccessError };
