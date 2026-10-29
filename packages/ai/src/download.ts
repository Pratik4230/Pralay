import {
  ImageGenerationError,
  isRetryableHttpStatus,
  parseRetryAfterMs,
} from "./image-generation-error.js";

export const MAX_GENERATED_IMAGE_BYTES = 32 * 1024 * 1024;

function detectedImageType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .every(
        (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index],
      )
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

function assertSafeImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ImageGenerationError("Invalid generated image URL", {
      code: "generated_image_download_failed",
      retryable: false,
    });
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
    url.hostname.startsWith("[")
  ) {
    throw new ImageGenerationError("Unsafe generated image URL", {
      code: "generated_image_download_failed",
      retryable: false,
    });
  }
}

export type DownloadedBinary = {
  buffer: Buffer;
  contentType: string;
};

export async function downloadBinary(url: string): Promise<DownloadedBinary> {
  assertSafeImageUrl(url);
  let response: Response;
  try {
    response = await fetch(url, { redirect: "error" });
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
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_GENERATED_IMAGE_BYTES
  ) {
    await response.body?.cancel();
    throw new ImageGenerationError("Generated image exceeds the 32 MB limit", {
      code: "generated_image_download_failed",
      retryable: false,
    });
  }
  if (!response.body) {
    throw new ImageGenerationError("Generated image response is empty", {
      code: "generated_image_download_failed",
      retryable: true,
    });
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_GENERATED_IMAGE_BYTES) {
        throw new ImageGenerationError(
          "Generated image exceeds the 32 MB limit",
          {
            code: "generated_image_download_failed",
            retryable: false,
          },
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ImageGenerationError) throw error;
    throw new ImageGenerationError("Could not read the generated image", {
      code: "generated_image_download_failed",
      retryable: true,
      cause: error,
    });
  } finally {
    await reader.cancel().catch(() => {});
  }

  const buffer = Buffer.concat(chunks, total);
  const contentType = detectedImageType(buffer);
  if (!contentType) {
    throw new ImageGenerationError(
      "Provider returned an unsupported or invalid image",
      {
        code: "generated_image_download_failed",
        retryable: false,
      },
    );
  }
  return {
    buffer,
    contentType,
  };
}
