import type { Context } from "hono";
import { z } from "zod";

import {
  createPresignedDownloadUrl,
  getMediaUrl,
  isStorageConfigured,
  parseWorkspaceIdFromWorkspaceUploadKey,
} from "@repo/storage";
import { createApiError, unauthorizedError } from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import { getWorkspaceForUser } from "../../workspace/services/workspaces.service.js";

const mediaQuerySchema = z.object({
  key: z.string().min(1).max(512),
});

const storageNotConfiguredError = createApiError(
  "HTTP_ERROR",
  "File storage is not configured",
);

const mediaNotFoundError = createApiError("NOT_FOUND", "Media not found");

export async function getMediaController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const parsed = mediaQuerySchema.safeParse({
    key: c.req.query("key"),
  });

  if (!parsed.success) {
    return c.json(mediaNotFoundError, 404);
  }

  const { key } = parsed.data;

  if (!isStorageConfigured()) {
    return c.json(storageNotConfiguredError, 503);
  }

  const workspaceId = parseWorkspaceIdFromWorkspaceUploadKey(key);
  if (workspaceId) {
    const workspace = await getWorkspaceForUser(session.user.id, workspaceId);
    if (!workspace) {
      return c.json(mediaNotFoundError, 404);
    }
  }

  const cdnUrl = getMediaUrl(key);
  if (cdnUrl) {
    return c.redirect(cdnUrl, 302);
  }

  const downloadUrl = await createPresignedDownloadUrl({ key });
  return c.redirect(downloadUrl, 302);
}
