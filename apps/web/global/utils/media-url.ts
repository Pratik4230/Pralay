import { env } from "@/global/utils/env";

export function getMediaUrl(key: string | null | undefined) {
  if (!key) {
    return null;
  }

  const cdnUrl = process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  if (cdnUrl) {
    return `${cdnUrl.replace(/\/$/, "")}/${key}`;
  }

  return `${env.appUrl}/api/v1/media?key=${encodeURIComponent(key)}`;
}
