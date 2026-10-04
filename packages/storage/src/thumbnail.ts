import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { getS3Client, putObjectBuffer } from "./presign.js";
import { storageEnv } from "./env.js";

const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

/** Produce a safe, bounded derivative without changing the uploaded original. */
export async function createImageThumbnail(input: {
  sourceKey: string;
  destinationKey: string;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) throw new Error("S3_BUCKET is not configured");

  const source = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: input.sourceKey }),
  );
  const bytes = await source.Body?.transformToByteArray();
  if (!bytes) throw new Error("Asset upload is empty");
  if (bytes.byteLength > 32 * 1024 * 1024) {
    throw new Error("Asset is too large to create a thumbnail");
  }

  const body = await sharp(bytes, { failOn: "none", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();

  if (body.byteLength > MAX_PREVIEW_BYTES) {
    throw new Error("Generated thumbnail exceeds size limit");
  }

  await putObjectBuffer({
    key: input.destinationKey,
    contentType: "image/webp",
    body,
  });
  return { key: input.destinationKey, contentType: "image/webp", sizeBytes: body.byteLength };
}
