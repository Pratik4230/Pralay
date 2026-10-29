import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import sharp from "sharp";

import { resizeImageBuffer } from "./resize-image.js";

describe("conventional image resize", () => {
  it("creates the requested dimensions and preserves the format", async () => {
    const source = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();

    const result = await resizeImageBuffer(source, {
      width: 32,
      height: 32,
      contentType: "image/png",
    });
    const metadata = await sharp(result.buffer).metadata();

    assert.equal(result.contentType, "image/png");
    assert.equal(metadata.width, 32);
    assert.equal(metadata.height, 32);
  });

  it("rejects excessive output dimensions", async () => {
    await assert.rejects(
      resizeImageBuffer(Buffer.from("image"), {
        width: 10_000,
        height: 10_000,
        contentType: "image/jpeg",
      }),
      /supported limits/,
    );
  });
});
