import { ImageGenerationError } from "@repo/ai";

export type GenerationJobErrorCode =
  | "generation_provider_failed"
  | "generation_download_failed"
  | "generation_storage_failed"
  | "generation_invalid_input"
  | "generation_not_configured"
  | "generation_failed";

export class GenerationJobError extends Error {
  readonly code: GenerationJobErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly userMessage: string;

  constructor(
    message: string,
    options: {
      code: GenerationJobErrorCode;
      retryable: boolean;
      retryAfterMs?: number | null;
      userMessage?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "GenerationJobError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.userMessage = options.userMessage ?? message;
  }
}

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const metadata = "$metadata" in error ? error.$metadata : null;
  if (!metadata || typeof metadata !== "object") return null;
  const status =
    "httpStatusCode" in metadata ? metadata.httpStatusCode : undefined;
  return typeof status === "number" ? status : null;
}

function isRetryableInfrastructureError(error: unknown): boolean {
  const status = getHttpStatus(error);
  if (status !== null) {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  if (!(error instanceof Error)) return true;
  return new Set([
    "AbortError",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "NetworkingError",
    "RequestTimeout",
    "ServiceUnavailable",
    "SlowDown",
    "Throttling",
    "ThrottlingException",
  ]).has(error.name);
}

export function classifyGenerationJobError(error: unknown): GenerationJobError {
  if (error instanceof GenerationJobError) return error;

  if (error instanceof ImageGenerationError) {
    const download = error.code === "generated_image_download_failed";
    return new GenerationJobError(error.message, {
      code: download
        ? "generation_download_failed"
        : "generation_provider_failed",
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs,
      userMessage: download
        ? "The generated image could not be downloaded."
        : error.retryable
          ? "The image provider is temporarily unavailable."
          : "The image provider rejected this generation request.",
      cause: error,
    });
  }

  if (error instanceof Error) {
    if (
      error.name === "StorageNotConfiguredError" ||
      error.message.includes(
        "Missing required environment variable: XAI_API_KEY",
      )
    ) {
      return new GenerationJobError(error.message, {
        code: "generation_not_configured",
        retryable: false,
        userMessage: "Image generation is not configured.",
        cause: error,
      });
    }

    if (
      error.name === "InvalidGenerationInputAssetsError" ||
      error.name === "InvalidGenerationReferenceCountError" ||
      error.name === "GenerationNotFoundError"
    ) {
      return new GenerationJobError(error.message, {
        code: "generation_invalid_input",
        retryable: false,
        userMessage: error.message,
        cause: error,
      });
    }

    if (
      getHttpStatus(error) !== null ||
      isRetryableInfrastructureError(error)
    ) {
      const retryable = isRetryableInfrastructureError(error);
      return new GenerationJobError(error.message, {
        code: "generation_storage_failed",
        retryable,
        userMessage: retryable
          ? "File storage is temporarily unavailable."
          : "The generated image could not be saved.",
        cause: error,
      });
    }
  }

  const message = error instanceof Error ? error.message : "Generation failed";
  return new GenerationJobError(message, {
    code: "generation_failed",
    retryable: true,
    userMessage: "Image generation failed temporarily.",
    cause: error,
  });
}
