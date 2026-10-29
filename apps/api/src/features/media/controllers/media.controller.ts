import type { Context } from "hono";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@repo/db";
import { assets, projects, workspaces } from "@repo/db/schema";

import { createPresignedDownloadUrl, isStorageConfigured } from "@repo/storage";
import { createApiError, unauthorizedError } from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import { getWorkspaceForUser } from "../../workspace/services/workspaces.service.js";
import { parseMediaKeyScope } from "../services/media-key-scope.js";

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

  const scope = parseMediaKeyScope(key);
  if (!scope) return c.json(mediaNotFoundError, 404);

  let workspaceId: string;
  if (scope.kind === "project-cover") {
    const [project] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(
        and(
          eq(projects.id, scope.projectId),
          eq(projects.coverKey, key),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);
    if (!project) return c.json(mediaNotFoundError, 404);
    workspaceId = project.workspaceId;
  } else {
    workspaceId = scope.workspaceId;
  }

  const workspace = await getWorkspaceForUser(session.user.id, workspaceId);
  if (!workspace) return c.json(mediaNotFoundError, 404);

  if (scope.kind === "workspace-asset") {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt),
          or(eq(assets.s3Key, key), eq(assets.thumbnailKey, key)),
        ),
      )
      .limit(1);
    if (!asset) return c.json(mediaNotFoundError, 404);
  } else if (scope.kind === "workspace-brand") {
    const [brand] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          isNull(workspaces.deletedAt),
          or(eq(workspaces.avatarKey, key), eq(workspaces.coverImageKey, key)),
        ),
      )
      .limit(1);
    if (!brand) return c.json(mediaNotFoundError, 404);
  }

  const downloadUrl = await createPresignedDownloadUrl({ key });
  c.header("Cache-Control", "private, no-store");
  return c.redirect(downloadUrl, 302);
}
