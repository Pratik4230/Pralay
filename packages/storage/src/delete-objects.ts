import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

import { isStorageConfigured, storageEnv } from "./env.js";
import { buildWorkspaceUploadsPrefix } from "./keys.js";
import { getS3Client } from "./presign.js";

/** Best-effort single-object delete; no-op if storage is not configured. */
export async function deleteObject(key: string) {
  const bucket = storageEnv.bucket;
  if (!bucket || !key) {
    return;
  }

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deleteObjectsWithPrefix(prefix: string) {
  const bucket = storageEnv.bucket;
  if (!bucket || !prefix) {
    return;
  }

  let continuationToken: string | undefined;

  do {
    const listing = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys =
      listing.Contents?.map((item) => item.Key).filter(
        (key): key is string => Boolean(key),
      ) ?? [];

    if (keys.length > 0) {
      await getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
    }

    continuationToken = listing.IsTruncated
      ? listing.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

/** Removes workspace upload objects only (not generated/ or other prefixes). */
export async function deleteWorkspaceUploadObjects(workspaceId: string) {
  if (!isStorageConfigured()) {
    return;
  }

  await deleteObjectsWithPrefix(buildWorkspaceUploadsPrefix(workspaceId));
}
