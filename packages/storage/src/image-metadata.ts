import sharp from "sharp";

/** Validate the decoded image before it is written to object storage. */
export async function inspectGeneratedImage(bytes: Buffer): Promise<{
  width: number;
  height: number;
}> {
  const metadata = await sharp(bytes, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > 40_000_000 ||
    (metadata.pages && metadata.pages > 1)
  ) {
    throw new Error("Generated image has invalid dimensions");
  }
  await sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 }).stats();
  return { width: metadata.width, height: metadata.height };
}
