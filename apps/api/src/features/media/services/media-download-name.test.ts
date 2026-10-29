import { describe, expect, test } from "bun:test";

import { getMediaDownloadName } from "./media-download-name.js";

describe("media download names", () => {
  test("adds the extension implied by the stored image type", () => {
    expect(getMediaDownloadName("black rose", "image/png")).toBe(
      "black rose.png",
    );
  });

  test("preserves an existing extension", () => {
    expect(getMediaDownloadName("black-rose.jpeg", "image/jpeg")).toBe(
      "black-rose.jpeg",
    );
  });

  test("uses a safe fallback for a blank name", () => {
    expect(getMediaDownloadName("   ", "image/webp")).toBe("image.webp");
  });
});
