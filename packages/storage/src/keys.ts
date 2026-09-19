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

const workspaceUploadKeyPattern =
  /^uploads\/workspaces\/([^/]+)\/(?:avatars|assets)\/.+$/;

/** Workspace id from any user upload under `uploads/workspaces/{id}/`. */
export function parseWorkspaceIdFromWorkspaceUploadKey(key: string) {
  const match = workspaceUploadKeyPattern.exec(key);
  return match?.[1] ?? null;
}

const assetExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getAssetExtension(contentType: string) {
  const extension = assetExtensions[contentType];
  if (!extension) {
    throw new Error(`Unsupported asset content type: ${contentType}`);
  }

  return extension;
}

export function sanitizeAssetFileBaseName(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "asset";
}

export function buildWorkspaceAssetKey(
  workspaceId: string,
  contentType: string,
  fileName?: string,
) {
  const extension = getAssetExtension(contentType);
  const uniqueSuffix = randomUUID().slice(0, 8);
  const base = fileName ? sanitizeAssetFileBaseName(fileName) : "asset";
  return `uploads/workspaces/${workspaceId}/assets/${base}-${uniqueSuffix}.${extension}`;
}

export function parseWorkspaceIdFromAssetKey(key: string) {
  const match = /^uploads\/workspaces\/([^/]+)\/assets\/.+$/.exec(key);
  return match?.[1] ?? null;
}

/** All user uploads for a workspace (avatars today; assets under same tree later). */
export function buildWorkspaceUploadsPrefix(workspaceId: string) {
  return `uploads/workspaces/${workspaceId}/`;
}

// ─── Project covers ───────────────────────────────────────────────────────────

const coverExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getCoverExtension(contentType: string) {
  const extension = coverExtensions[contentType];
  if (!extension) {
    throw new Error(`Unsupported cover content type: ${contentType}`);
  }
  return extension;
}

/**
 * Builds the S3 key for a project cover image.
 * Pattern: `uploads/projects/{projectId}/covers/{base}-{uuid8}.{ext}`
 */
export function buildProjectCoverKey(
  projectId: string,
  contentType: string,
  fileName?: string,
) {
  const extension = getCoverExtension(contentType);
  const uniqueSuffix = randomUUID().slice(0, 8);
  const base = fileName
    ? fileName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "cover"
    : "cover";
  return `uploads/projects/${projectId}/covers/${base}-${uniqueSuffix}.${extension}`;
}

/**
 * Extracts the project ID from a cover key.
 * Returns null if the key doesn't match the expected pattern.
 */
export function parseProjectIdFromCoverKey(key: string) {
  const match = /^uploads\/projects\/([^/]+)\/covers\/.+$/.exec(key);
  return match?.[1] ?? null;
}
