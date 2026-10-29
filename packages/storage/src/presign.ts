import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { storageEnv } from "./env.js";

let cachedClient: S3Client | null = null;

export function getS3Client() {
  if (!cachedClient) {
    cachedClient = new S3Client({ region: storageEnv.region });
  }

  return cachedClient;
}

export async function createPresignedUploadUrl(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const expiresIn = input.expiresIn ?? 900;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

  return { uploadUrl, expiresIn };
}

export async function createPresignedDownloadUrl(input: {
  key: string;
  expiresIn?: number;
  downloadName?: string;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const expiresIn = input.expiresIn ?? 3600;
  const safeDownloadName = input.downloadName
    ?.replace(/["\\\r\n]/g, "_")
    .slice(0, 180);
  const asciiDownloadName = safeDownloadName
    ?.normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentDisposition: safeDownloadName
      ? `attachment; filename="${asciiDownloadName || "image"}"; filename*=UTF-8''${encodeURIComponent(safeDownloadName)}`
      : undefined,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function getObjectBuffer(input: {
  key: string;
  maxBytes?: number;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: input.key }),
  );
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error("Stored object is empty");
  if (bytes.byteLength > (input.maxBytes ?? 32 * 1024 * 1024)) {
    throw new Error("Stored object exceeds the processing size limit");
  }
  return Buffer.from(bytes);
}

export async function putObjectBuffer(input: {
  key: string;
  contentType: string;
  body: Uint8Array | Buffer;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
      Body: input.body,
    }),
  );

  return { bucket, key: input.key };
}

export function getMediaUrl(key: string) {
  if (storageEnv.mediaCdnUrl) {
    return `${storageEnv.mediaCdnUrl.replace(/\/$/, "")}/${key}`;
  }

  return null;
}
