import {
  ImageGenerationError,
  isRetryableHttpStatus,
  parseRetryAfterMs,
} from "./image-generation-error.js";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type DownloadedBinary = {
  buffer: Buffer;
  contentType: string;
};

export async function downloadBinary(url: string): Promise<DownloadedBinary> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ImageGenerationError("Could not download the generated image", {
      code: "generated_image_download_failed",
      retryable: true,
      cause: error,
    });
  }
  if (!response.ok) {
    throw new ImageGenerationError(
      `Failed to download generated image (${response.status})`,
      {
        code: "generated_image_download_failed",
        retryable: isRetryableHttpStatus(response.status),
        status: response.status,
        retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
      },
    );
  }

  const headerType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim();
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
