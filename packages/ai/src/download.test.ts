import { afterEach, describe, expect, it, mock } from "bun:test";

import { downloadBinary, MAX_GENERATED_IMAGE_BYTES } from "./download.js";
import { ImageGenerationError } from "./image-generation-error.js";

const originalFetch = globalThis.fetch;
const providerUrl = "https://images.example.com/output.png";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("generated image download", () => {
  it("rejects unsafe URLs before making a request", async () => {
    const fetchMock = mock(async () => new Response());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      downloadBinary("http://localhost/private"),
    ).rejects.toBeInstanceOf(ImageGenerationError);
    await expect(
      downloadBinary("https://127.0.0.1/private"),
    ).rejects.toBeInstanceOf(ImageGenerationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses image bytes for MIME rather than trusting a bad header", async () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    globalThis.fetch = mock(
      async () =>
        new Response(png, {
          headers: { "content-type": "text/plain" },
        }),
    ) as unknown as typeof fetch;
    const result = await downloadBinary(providerUrl);
    expect(result.contentType).toBe("image/png");
    expect(result.buffer).toEqual(Buffer.from(png));
  });

  it("rejects a declared oversized response", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("ignored", {
          headers: { "content-length": String(MAX_GENERATED_IMAGE_BYTES + 1) },
        }),
    ) as unknown as typeof fetch;
    await expect(downloadBinary(providerUrl)).rejects.toMatchObject({
      retryable: false,
    });
  });

  it("rejects streamed bytes beyond the limit", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let count = 0;
    globalThis.fetch = mock(
      async () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.enqueue(chunk);
              count += 1;
              if (count > 32) controller.close();
            },
          }),
        ),
    ) as unknown as typeof fetch;
    await expect(downloadBinary(providerUrl)).rejects.toMatchObject({
      retryable: false,
    });
  });

  it("rejects non-image content", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("<html>error</html>", {
          headers: { "content-type": "image/png" },
        }),
    ) as unknown as typeof fetch;
    await expect(downloadBinary(providerUrl)).rejects.toMatchObject({
      retryable: false,
    });
  });
});
