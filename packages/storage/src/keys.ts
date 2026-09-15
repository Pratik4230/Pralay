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

export function buildWorkspaceAvatarKey(
  workspaceId: string,
  contentType: string,
) {
  const extension = getAvatarExtension(contentType);
  return `uploads/workspaces/${workspaceId}/avatars/${randomUUID()}.${extension}`;
}

export function parseWorkspaceIdFromAvatarKey(key: string) {
  const match = /^uploads\/workspaces\/([^/]+)\/avatars\/.+$/.exec(key);
  return match?.[1] ?? null;
}
