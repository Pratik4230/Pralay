import sharp from "sharp";

const MAX_DIMENSION = 8_192;
const MAX_OUTPUT_PIXELS = 40_000_000;

export type ResizeImageInput = {
  width: number;
  height: number;
  contentType: string;
};

export async function resizeImageBuffer(
  bytes: Uint8Array | Buffer,
  input: ResizeImageInput,
) {
  if (
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > MAX_DIMENSION ||
    input.height > MAX_DIMENSION ||
    input.width * input.height > MAX_OUTPUT_PIXELS
  ) {
    throw new Error("Resize dimensions exceed the supported limits");
  }

  let pipeline = sharp(bytes, {
    failOn: "error",
    limitInputPixels: MAX_OUTPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: input.width,
      height: input.height,
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    });

  if (input.contentType === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (input.contentType === "image/webp") {
    pipeline = pipeline.webp({ quality: 90, effort: 4 });
  } else if (input.contentType === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
  } else {
    throw new Error("Resize supports JPEG, PNG, and WebP images");
  }

  const buffer = await pipeline.toBuffer();
  return {
    buffer,
    contentType: input.contentType,
    width: input.width,
    height: input.height,
  };
}
