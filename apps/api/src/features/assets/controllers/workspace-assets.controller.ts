import type { Context } from "hono";
import { z } from "zod";

import {
  assetNotFoundError,
  bulkDeleteWorkspaceAssetsBodySchema,
  bulkDeleteWorkspaceAssetsResponseSchema,
  createApiError,
  createWorkspaceAssetBodySchema,
  createWorkspaceAssetUploadBodySchema,
  deleteWorkspaceAssetResponseSchema,
  invalidAssetListCursorError,
  invalidWorkspaceMediaKeyError,
  listWorkspaceAssetsQuerySchema,
  unauthorizedError,
  updateWorkspaceAssetBodySchema,
  workspaceAssetListResponseSchema,
  workspaceAssetSchema,
  workspaceAssetUploadResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import { WorkspaceAccessError } from "../../workspace/services/workspace-access.service.js";
import {
  AssetListCursorError,
  AssetNotFoundError,
  bulkDeleteWorkspaceAssets,
  createWorkspaceAsset,
  createWorkspaceAssetUpload,
  deleteWorkspaceAsset,
  InvalidWorkspaceAssetKeyError,
  listWorkspaceAssets,
  StorageNotConfiguredError,
  updateWorkspaceAsset,
} from "../services/workspace-assets.service.js";

const storageNotConfiguredError = createApiError(
  "HTTP_ERROR",
  "File storage is not configured",
);

const createWorkspaceAssetResponseSchema = z.object({
  asset: workspaceAssetSchema,
});

export async function listWorkspaceAssetsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const query = listWorkspaceAssetsQuerySchema.parse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });

  try {
    const result = await listWorkspaceAssets(
      session.user.id,
      workspaceId,
      query,
    );
    return c.json(workspaceAssetListResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof AssetListCursorError) {
      return c.json(invalidAssetListCursorError, 400);
    }
    throw error;
  }
}

export async function createWorkspaceAssetUploadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = createWorkspaceAssetUploadBodySchema.parse(await c.req.json());

  try {
    const result = await createWorkspaceAssetUpload(
      session.user.id,
      workspaceId,
      body.contentType,
      body.fileName,
    );

    return c.json(workspaceAssetUploadResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return c.json(storageNotConfiguredError, 503);
    }
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

export async function createWorkspaceAssetController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = createWorkspaceAssetBodySchema.parse(await c.req.json());

  try {
    const asset = await createWorkspaceAsset(
      session.user.id,
      workspaceId,
      body,
    );
    return c.json(createWorkspaceAssetResponseSchema.parse({ asset }), 201);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return c.json(storageNotConfiguredError, 503);
    }
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof InvalidWorkspaceAssetKeyError) {
      return c.json(invalidWorkspaceMediaKeyError, 400);
    }
    throw error;
  }
}

export async function deleteWorkspaceAssetController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const assetId = c.req.param("assetId");
  if (!workspaceId || !assetId) return c.json(assetNotFoundError, 404);

  try {
    const result = await deleteWorkspaceAsset(
      session.user.id,
      workspaceId,
      assetId,
    );
    return c.json(deleteWorkspaceAssetResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof AssetNotFoundError) {
      return c.json(assetNotFoundError, 404);
    }
    throw error;
  }
}

export async function bulkDeleteWorkspaceAssetsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = bulkDeleteWorkspaceAssetsBodySchema.parse(await c.req.json());

  try {
    const result = await bulkDeleteWorkspaceAssets(
      session.user.id,
      workspaceId,
      body.ids,
    );
    return c.json(bulkDeleteWorkspaceAssetsResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

export async function updateWorkspaceAssetController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const assetId = c.req.param("assetId");
  if (!workspaceId || !assetId) return c.json(assetNotFoundError, 404);

  const body = updateWorkspaceAssetBodySchema.parse(await c.req.json());

  try {
    const asset = await updateWorkspaceAsset(
      session.user.id,
      workspaceId,
      assetId,
      body,
    );
    return c.json(
      z.object({ asset: workspaceAssetSchema }).parse({ asset }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof AssetNotFoundError) {
      return c.json(assetNotFoundError, 404);
    }
    throw error;
  }
}
