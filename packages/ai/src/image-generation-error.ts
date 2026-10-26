export type ImageGenerationErrorCode =
  | "provider_request_failed"
  | "provider_response_invalid"
  | "generated_image_download_failed";

export class ImageGenerationError extends Error {
  readonly code: ImageGenerationErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    options: {
      code: ImageGenerationErrorCode;
      retryable: boolean;
      status?: number | null;
      retryAfterMs?: number | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ImageGenerationError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export function isRetryableHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

export function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}
