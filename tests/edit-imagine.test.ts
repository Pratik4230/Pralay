import { afterEach, describe, expect, test } from "bun:test";

import { editImagineWithReferences } from "../packages/ai/src/edit-imagine.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("xAI multi-reference editing", () => {
  test("rejects six image URLs before making a request", async () => {
    let requested = false;
    globalThis.fetch = (() => {
      requested = true;
      throw new Error("unexpected request");
    }) as typeof fetch;

    await expect(
      editImagineWithReferences({
        prompt: "test",
        referenceImageUrls: Array.from(
          { length: 6 },
          (_, index) => `https://example.test/${index}.png`,
        ),
        apiKey: "test-key",
      }),
    ).rejects.toThrow("at most five");
    expect(requested).toBe(false);
  });

  test("preserves selected image order in the xAI request", async () => {
    let requestBody: unknown;
    globalThis.fetch = (async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ data: [{ url: "https://example.test/result.png" }] }),
        { status: 200 },
      );
    }) as typeof fetch;

    await editImagineWithReferences({
      prompt: "test",
      referenceImageUrls: [
        "https://example.test/base.png",
        "https://example.test/identity.png",
      ],
      apiKey: "test-key",
    });

    expect(requestBody).toMatchObject({
      images: [
        { url: "https://example.test/base.png" },
        { url: "https://example.test/identity.png" },
      ],
    });
  });
});
