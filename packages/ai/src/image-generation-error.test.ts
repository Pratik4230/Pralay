import { describe, expect, test } from "bun:test";

import {
  isRetryableHttpStatus,
  parseRetryAfterMs,
} from "./image-generation-error.js";

describe("image generation error metadata", () => {
  test("classifies transient provider statuses", () => {
    expect(isRetryableHttpStatus(408)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
  });

  test("parses retry-after seconds", () => {
    expect(parseRetryAfterMs("2.5")).toBe(2_500);
    expect(parseRetryAfterMs("invalid")).toBeNull();
    expect(parseRetryAfterMs(null)).toBeNull();
  });
});
