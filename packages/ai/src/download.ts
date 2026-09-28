const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type DownloadedBinary = {
  buffer: Buffer;
  contentType: string;
};

export async function downloadBinary(url: string): Promise<DownloadedBinary> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status})`);
  }

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const contentType =
    headerType && allowedContentTypes.has(headerType)
      ? headerType
      : "image/png";

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}
