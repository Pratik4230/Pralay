import {
  buildWorkspaceAvatarKey,
  createPresignedUploadUrl,
  isStorageConfigured,
} from "@repo/storage";

import {
  requireWorkspaceAdmin,
  WorkspaceAccessError,
} from "./workspace-access.service.js";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

export async function createWorkspaceAvatarUpload(
  actorUserId: string,
  workspaceId: string,
  contentType: string,
  fileName?: string,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const avatarKey = buildWorkspaceAvatarKey(workspaceId, contentType, fileName);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
    key: avatarKey,
    contentType,
  });

  return { avatarKey, uploadUrl, expiresIn };
}

export { WorkspaceAccessError };
