import { describe, expect, test } from "bun:test";

import { ImageGenerationError } from "@repo/ai";

import { classifyGenerationJobError } from "./generation-job-errors.js";

describe("generation job error classification", () => {
  test("retries provider throttling and preserves retry-after", () => {
    const result = classifyGenerationJobError(
      new ImageGenerationError("rate limited", {
        code: "provider_request_failed",
        retryable: true,
        status: 429,
        retryAfterMs: 12_000,
      }),
    );

    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(12_000);
    expect(result.code).toBe("generation_provider_failed");
  });

  test("does not retry permanent provider validation errors", () => {
    const result = classifyGenerationJobError(
      new ImageGenerationError("invalid prompt", {
        code: "provider_request_failed",
        retryable: false,
        status: 400,
      }),
    );

    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe(
      "The image provider rejected this generation request.",
    );
  });

  test("retries temporary storage failures", () => {
    const error = Object.assign(new Error("S3 unavailable"), {
      name: "ServiceUnavailable",
      $metadata: { httpStatusCode: 503 },
    });
    const result = classifyGenerationJobError(error);

    expect(result.retryable).toBe(true);
    expect(result.code).toBe("generation_storage_failed");
  });

  test("does not retry missing configuration", () => {
    const error = new Error("File storage is not configured");
    error.name = "StorageNotConfiguredError";
    const result = classifyGenerationJobError(error);

    expect(result.retryable).toBe(false);
    expect(result.code).toBe("generation_not_configured");
  });

  test("retries unknown failures with a safe user message", () => {
    const result = classifyGenerationJobError(
      new Error("internal implementation details"),
    );

    expect(result.retryable).toBe(true);
    expect(result.userMessage).toBe("Image generation failed temporarily.");
  });
});
