import { randomUUID } from "node:crypto";

const avatarExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getAvatarExtension(contentType: string) {
  const extension = avatarExtensions[contentType];
  if (!extension) {
    throw new Error(`Unsupported avatar content type: ${contentType}`);
  }

  return extension;
}

export function sanitizeAvatarFileBaseName(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "avatar";
}

export function buildWorkspaceAvatarKey(
  workspaceId: string,
  contentType: string,
  fileName?: string,
) {
  const extension = getAvatarExtension(contentType);
  const uniqueSuffix = randomUUID().slice(0, 8);
  const base = fileName ? sanitizeAvatarFileBaseName(fileName) : "avatar";
  return `uploads/workspaces/${workspaceId}/avatars/${base}-${uniqueSuffix}.${extension}`;
}

export function parseWorkspaceIdFromAvatarKey(key: string) {
  const match = /^uploads\/workspaces\/([^/]+)\/avatars\/.+$/.exec(key);
  return match?.[1] ?? null;
}

/** All user uploads for a workspace (avatars today; assets under same tree later). */
export function buildWorkspaceUploadsPrefix(workspaceId: string) {
  return `uploads/workspaces/${workspaceId}/`;
}
