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
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

  return { uploadUrl, expiresIn };
}

export async function createPresignedDownloadUrl(input: {
  key: string;
  expiresIn?: number;
}) {
  const bucket = storageEnv.bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const expiresIn = input.expiresIn ?? 3600;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export function getMediaUrl(key: string) {
  if (storageEnv.mediaCdnUrl) {
    return `${storageEnv.mediaCdnUrl.replace(/\/$/, "")}/${key}`;
  }

  return null;
}
