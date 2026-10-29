import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import sharp from "sharp";

import { inspectGeneratedImage } from "./image-metadata.js";

describe("generated image metadata", () => {
  it("reads verified dimensions", async () => {
    const bytes = await sharp({
      create: { width: 24, height: 12, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    assert.deepEqual(await inspectGeneratedImage(bytes), {
      width: 24,
      height: 12,
    });
  });

  it("rejects invalid image bytes", async () => {
    await assert.rejects(inspectGeneratedImage(Buffer.from("not an image")));
  });
});
