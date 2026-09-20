import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assets, projectAssets } from "@repo/db/schema";
import {
  buildWorkspaceAssetKey,
  createPresignedUploadUrl,
  deleteObject,
  isStorageConfigured,
  parseWorkspaceIdFromAssetKey,
  storageEnv,
} from "@repo/storage";
import type {
  CreateWorkspaceAssetBody,
  ListWorkspaceAssetsQuery,
  UpdateWorkspaceAssetBody,
} from "@repo/validators";

import {
  requireWorkspaceMembership,
  WorkspaceAccessError,
} from "../../workspace/services/workspace-access.service.js";
import {
  getWorkspaceProject,
  ProjectNotFoundError,
} from "../../projects/services/workspace-projects.service.js";
import {
  AssetListCursorError,
  decodeAssetListCursor,
  encodeAssetListCursor,
} from "./asset-list-cursor.js";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

export class InvalidWorkspaceAssetKeyError extends Error {
  constructor() {
    super("Storage key is not valid for this workspace");
    this.name = "InvalidWorkspaceAssetKeyError";
  }
}

export class AssetNotFoundError extends Error {
  constructor() {
    super("Asset not found");
    this.name = "AssetNotFoundError";
  }
}

export { AssetListCursorError };

type AssetRow = {
  id: string;
  workspaceId: string | null;
  primaryProjectId: string | null;
  name: string;
  category: "person" | "logo" | "product" | "background" | "reference" | "other";
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
};

export function mapAssetRow(row: AssetRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId!,
    primaryProjectId: row.primaryProjectId,
    name: row.name,
    category: row.category,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    s3Key: row.s3Key,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const assetSelect = {
  id: assets.id,
  workspaceId: assets.workspaceId,
  primaryProjectId: assets.primaryProjectId,
  name: assets.name,
  category: assets.category,
  mimeType: assets.mimeType,
  sizeBytes: assets.sizeBytes,
  width: assets.width,
  height: assets.height,
  s3Key: assets.s3Key,
  createdAt: assets.createdAt,
  updatedAt: assets.updatedAt,
};

export async function createWorkspaceAssetUpload(
  actorUserId: string,
  workspaceId: string,
  contentType: string,
  fileName?: string,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await requireWorkspaceMembership(actorUserId, workspaceId);

  const assetKey = buildWorkspaceAssetKey(workspaceId, contentType, fileName);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
    key: assetKey,
    contentType,
  });

  return { assetKey, uploadUrl, expiresIn };
}

export async function createWorkspaceAsset(
  actorUserId: string,
  workspaceId: string,
  input: CreateWorkspaceAssetBody,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await requireWorkspaceMembership(actorUserId, workspaceId);

  const keyWorkspaceId = parseWorkspaceIdFromAssetKey(input.s3Key);
  if (keyWorkspaceId !== workspaceId) {
    throw new InvalidWorkspaceAssetKeyError();
  }

  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new StorageNotConfiguredError();
  }

  const name =
    input.name?.trim() ||
    input.s3Key.split("/").pop()?.replace(/\.[^.]+$/, "") ||
    "Untitled";

  if (input.projectId) {
    await getWorkspaceProject(actorUserId, workspaceId, input.projectId);
  }

  const asset = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(assets)
      .values({
        scope: "workspace",
        workspaceId,
        primaryProjectId: input.projectId ?? null,
        name,
        type: "upload",
        category: input.category ?? "other",
        visibility: input.projectId ? "project" : "workspace",
        mimeType: input.contentType,
        sizeBytes: input.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
        s3Bucket: bucket,
        s3Key: input.s3Key,
        createdBy: actorUserId,
      })
      .returning(assetSelect);

    if (!created) {
      throw new Error("Failed to create asset");
    }

    if (input.projectId) {
      await tx.insert(projectAssets).values({
        projectId: input.projectId,
        assetId: created.id,
      });
    }

    return created;
  });

  return mapAssetRow(asset as AssetRow);
}

export async function listWorkspaceAssets(
  actorUserId: string,
  workspaceId: string,
  query: ListWorkspaceAssetsQuery = { limit: 24, scope: "workspace" },
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  if (query.scope === "project") {
    if (!query.projectId) {
      throw new ProjectNotFoundError();
    }
    await getWorkspaceProject(actorUserId, workspaceId, query.projectId);
  }

  const limit = query.limit;
  const fetchLimit = limit + 1;

  const conditions = [
    eq(assets.workspaceId, workspaceId),
    eq(assets.scope, "workspace"),
    eq(assets.type, "upload"),
    isNull(assets.deletedAt),
  ];

  if (query.scope === "workspace") {
    conditions.push(isNull(assets.primaryProjectId));
  } else {
    conditions.push(eq(assets.primaryProjectId, query.projectId!));
  }

  if (query.cursor) {
    const cursor = decodeAssetListCursor(query.cursor);
    conditions.push(
      or(
        lt(assets.createdAt, cursor.createdAt),
        and(eq(assets.createdAt, cursor.createdAt), lt(assets.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select(assetSelect)
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt), desc(assets.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    assets: pageRows.map((row) => mapAssetRow(row as AssetRow)),
    nextCursor:
      hasMore && lastRow
        ? encodeAssetListCursor({
            createdAt: lastRow.createdAt,
            id: lastRow.id,
          })
        : null,
    hasMore,
  };
}

export async function deleteWorkspaceAsset(
  actorUserId: string,
  workspaceId: string,
  assetId: string,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const [existing] = await db
    .select({
      id: assets.id,
    })
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AssetNotFoundError();
  }

  // Soft delete — moves to Trash with 29-day recovery window
  await db
    .update(assets)
    .set({
      deletedAt: new Date(),
      deletedBy: actorUserId,
    })
    .where(eq(assets.id, assetId));

  return { success: true as const };
}

/**
 * Moves multiple assets to trash in a single DB query.
 *
 * Returns { deleted, failed } — `failed` contains IDs that were not found
 * or did not belong to this workspace.
 */
export async function bulkDeleteWorkspaceAssets(
  actorUserId: string,
  workspaceId: string,
  ids: string[],
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  // Fetch all matching active assets in one query
  const existing = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.workspaceId, workspaceId),
        inArray(assets.id, ids),
        isNull(assets.deletedAt),
      ),
    );

  if (existing.length === 0) {
    return { deleted: [] as string[], failed: ids };
  }

  const existingIds = existing.map((a) => a.id);

  // Soft delete all matched rows
  await db
    .update(assets)
    .set({
      deletedAt: new Date(),
      deletedBy: actorUserId,
    })
    .where(inArray(assets.id, existingIds));

  const deletedSet = new Set(existingIds);
  const failed = ids.filter((id) => !deletedSet.has(id));

  return { deleted: existingIds, failed };
}

export async function restoreWorkspaceAsset(
  actorUserId: string,
  workspaceId: string,
  assetId: string,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const [existing] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.workspaceId, workspaceId),
        isNotNull(assets.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AssetNotFoundError();
  }

  await db
    .update(assets)
    .set({
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));

  return { success: true as const };
}

export async function permanentlyDeleteWorkspaceAsset(
  actorUserId: string,
  workspaceId: string,
  assetId: string,
) {
  // Permanent delete is owner-only
  const { requireWorkspaceOwner } = await import(
    "../../workspace/services/workspace-access.service.js"
  );
  await requireWorkspaceOwner(actorUserId, workspaceId);

  const [existing] = await db
    .select({ id: assets.id, s3Key: assets.s3Key, thumbnailKey: assets.thumbnailKey })
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AssetNotFoundError();
  }

  await db.delete(assets).where(eq(assets.id, assetId));

  try {
    await deleteObject(existing.s3Key);
    if (existing.thumbnailKey) {
      await deleteObject(existing.thumbnailKey);
    }
  } catch {
    // Best-effort S3 cleanup
  }

  return { success: true as const };
}

export async function updateWorkspaceAsset(
  actorUserId: string,
  workspaceId: string,
  assetId: string,
  input: UpdateWorkspaceAssetBody,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const [updated] = await db
    .update(assets)
    .set({
      name: input.name.trim(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
      ),
    )
    .returning(assetSelect);

  if (!updated) {
    throw new AssetNotFoundError();
  }

  return mapAssetRow(updated as AssetRow);
}

export { WorkspaceAccessError, ProjectNotFoundError };
