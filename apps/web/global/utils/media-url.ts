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

/** Best-effort reverse of {@link getMediaUrl} for attachment URLs after send. */
export function parseMediaKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const keyParam = parsed.searchParams.get("key");
    if (keyParam) {
      return keyParam;
    }

    const cdnUrl = process.env.NEXT_PUBLIC_MEDIA_CDN_URL?.replace(/\/$/, "");
    if (cdnUrl && url.startsWith(`${cdnUrl}/`)) {
      return url.slice(cdnUrl.length + 1);
    }
  } catch {
    return null;
  }

  return null;
}
