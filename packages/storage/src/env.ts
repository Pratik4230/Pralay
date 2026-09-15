function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const storageEnv = {
  region: process.env.AWS_REGION ?? "ap-south-1",
  bucket: optional("S3_BUCKET"),
  mediaCdnUrl: optional("MEDIA_CDN_URL"),
} as const;

export function isStorageConfigured() {
  return Boolean(storageEnv.bucket);
}
