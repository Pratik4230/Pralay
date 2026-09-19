import { lt, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  assets,
  collections,
  generations,
  projects,
  templates,
  workspaces,
} from "@repo/db/schema";
import { deleteObject, deleteWorkspaceUploadObjects } from "@repo/storage";

/**
 * Permanently purges items that have been in the trash for more than 29 days.
 * Also cleans up any associated S3 storage objects.
 */
export async function purgeExpiredTrashItems() {
  const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

  // 1. Expired assets
  const expiredAssets = await db
    .select({ id: assets.id, s3Key: assets.s3Key, thumbnailKey: assets.thumbnailKey })
    .from(assets)
    .where(lt(assets.deletedAt, cutoff));

  if (expiredAssets.length > 0) {
    const assetIds = expiredAssets.map((a) => a.id);
    await db.delete(assets).where(sql`${assets.id} IN ${assetIds}`);

    await Promise.allSettled(
      expiredAssets.flatMap((a) => [
        deleteObject(a.s3Key),
        ...(a.thumbnailKey ? [deleteObject(a.thumbnailKey)] : []),
      ]),
    );
  }

  // 2. Expired projects
  const expiredProjects = await db
    .select({ id: projects.id, coverKey: projects.coverKey })
    .from(projects)
    .where(lt(projects.deletedAt, cutoff));

  if (expiredProjects.length > 0) {
    const projectIds = expiredProjects.map((p) => p.id);
    await db.delete(projects).where(sql`${projects.id} IN ${projectIds}`);

    await Promise.allSettled(
      expiredProjects
        .filter((p) => Boolean(p.coverKey))
        .map((p) => deleteObject(p.coverKey!)),
    );
  }

  // 3. Expired collections, templates, generations
  await Promise.allSettled([
    db.delete(collections).where(lt(collections.deletedAt, cutoff)),
    db.delete(templates).where(lt(templates.deletedAt, cutoff)),
    db.delete(generations).where(lt(generations.deletedAt, cutoff)),
  ]);

  // 4. Expired workspaces
  const expiredWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(lt(workspaces.deletedAt, cutoff));

  if (expiredWorkspaces.length > 0) {
    const workspaceIds = expiredWorkspaces.map((w) => w.id);
    await db.delete(workspaces).where(sql`${workspaces.id} IN ${workspaceIds}`);

    await Promise.allSettled(
      expiredWorkspaces.map((w) => deleteWorkspaceUploadObjects(w.id)),
    );
  }

  return {
    purgedAssets: expiredAssets.length,
    purgedProjects: expiredProjects.length,
    purgedWorkspaces: expiredWorkspaces.length,
  };
}

/**
 * Starts a 24-hour interval timer that runs auto-purge once a day in background.
 */
export function startTrashAutoPurgeScheduler() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Run after 1 minute on boot, then once every 24h
  setTimeout(() => {
    purgeExpiredTrashItems().catch((err) => {
      console.error("Auto-purge trash error:", err);
    });
    setInterval(() => {
      purgeExpiredTrashItems().catch((err) => {
        console.error("Auto-purge trash error:", err);
      });
    }, ONE_DAY_MS);
  }, 60 * 1000);
}
