import { describe, expect, test } from "bun:test";

import { createHeartbeatNdjsonStream } from "./heartbeat-ndjson-stream.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("heartbeat NDJSON stream", () => {
  test("emits heartbeats while the next event is slow", async () => {
    async function* events() {
      await Bun.sleep(25);
      yield { type: "done" };
    }

    const stream = createHeartbeatNdjsonStream({
      events: events(),
      encode: (event) => encoder.encode(`${JSON.stringify(event)}\n`),
      heartbeatEvent: { type: "ping" },
      heartbeatMs: 5,
    });
    const reader = stream.getReader();
    const first = await reader.read();

    expect(decoder.decode(first.value)).toBe('{"type":"ping"}\n');

    let body = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      body += decoder.decode(chunk.value);
    }
    expect(body).toContain('{"type":"done"}');
  });

  test("continues draining events after the consumer disconnects", async () => {
    let finished = false;
    async function* events() {
      await Bun.sleep(10);
      yield { type: "done" };
      finished = true;
    }

    const stream = createHeartbeatNdjsonStream({
      events: events(),
      encode: (event) => encoder.encode(`${JSON.stringify(event)}\n`),
      heartbeatEvent: { type: "ping" },
      heartbeatMs: 5,
    });
    await stream.cancel();
    await Bun.sleep(25);

    expect(finished).toBe(true);
  });
});
