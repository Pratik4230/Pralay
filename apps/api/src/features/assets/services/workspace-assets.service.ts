import { and, desc, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assets } from "@repo/db/schema";
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
} from "@repo/validators";

import {
  requireWorkspaceMembership,
  WorkspaceAccessError,
} from "../../workspace/services/workspace-access.service.js";
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

  const [asset] = await db
    .insert(assets)
    .values({
      scope: "workspace",
      workspaceId,
      name,
      type: "upload",
      category: input.category ?? "other",
      visibility: "workspace",
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      s3Bucket: bucket,
      s3Key: input.s3Key,
      createdBy: actorUserId,
    })
    .returning(assetSelect);

  if (!asset) {
    throw new Error("Failed to create asset");
  }

  return mapAssetRow(asset as AssetRow);
}

export async function listWorkspaceAssets(
  actorUserId: string,
  workspaceId: string,
  query: ListWorkspaceAssetsQuery = { limit: 24 },
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const limit = query.limit;
  const fetchLimit = limit + 1;

  const conditions = [
    eq(assets.workspaceId, workspaceId),
    eq(assets.scope, "workspace"),
    eq(assets.type, "upload"),
    isNull(assets.deletedAt),
  ];

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
      s3Key: assets.s3Key,
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

  const removed = await db
    .delete(assets)
    .where(eq(assets.id, assetId))
    .returning({ id: assets.id });

  if (removed.length === 0) {
    throw new AssetNotFoundError();
  }

  try {
    await deleteObject(existing.s3Key);
  } catch {
    // Best-effort S3 cleanup after the row is removed.
  }

  return { success: true as const };
}

export { WorkspaceAccessError };
