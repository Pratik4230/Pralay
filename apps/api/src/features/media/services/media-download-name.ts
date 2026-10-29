const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getMediaDownloadName(name: string, mimeType: string) {
  const extension = IMAGE_EXTENSIONS[mimeType.toLowerCase()];
  const cleanName = name.trim() || "image";
  if (!extension || /\.[a-z0-9]{2,5}$/i.test(cleanName)) {
    return cleanName.slice(0, 180);
  }

  return `${cleanName.slice(0, 170)}.${extension}`;
}
