import { describe, expect, test } from "bun:test";

import { calculateUsageCredits } from "./credits.js";

describe("generic AI credit policy", () => {
  test("meters text and embeddings by total token volume", () => {
    expect(
      calculateUsageCredits({
        modality: "text",
        inputTokens: 1_200,
        outputTokens: 350,
      }),
    ).toBe(2);
    expect(
      calculateUsageCredits({
        modality: "embedding",
        metrics: { tokens: 2_001 },
      }),
    ).toBe(3);
  });

  test("supports image, audio, video, and tool metrics", () => {
    expect(
      calculateUsageCredits({
        modality: "image",
        metrics: { outputImages: 2 },
      }),
    ).toBe(80);
    expect(
      calculateUsageCredits({
        modality: "audio",
        metrics: { outputSeconds: 21 },
      }),
    ).toBe(3);
    expect(
      calculateUsageCredits({
        modality: "video",
        metrics: { outputSeconds: 4 },
      }),
    ).toBe(40);
    expect(
      calculateUsageCredits({ modality: "tool", metrics: { requests: 3 } }),
    ).toBe(3);
  });
});
