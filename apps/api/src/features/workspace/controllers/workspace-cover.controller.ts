import type { Context } from "hono";

import {
  createApiError,
  createWorkspaceCoverUploadBodySchema,
  forbiddenError,
  unauthorizedError,
  workspaceCoverUploadResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/workspace-access.service.js";
import {
  createWorkspaceCoverUpload,
} from "../services/workspace-cover.service.js";
import { StorageNotConfiguredError } from "../services/workspace-avatar.service.js";

const storageNotConfiguredError = createApiError(
  "HTTP_ERROR",
  "File storage is not configured",
);

export async function createWorkspaceCoverUploadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = createWorkspaceCoverUploadBodySchema.parse(await c.req.json());

  try {
    const result = await createWorkspaceCoverUpload(
      session.user.id,
      workspaceId,
      body.contentType,
      body.fileName,
    );

    return c.json(workspaceCoverUploadResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return c.json(storageNotConfiguredError, 503);
    }
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    throw error;
  }
}
