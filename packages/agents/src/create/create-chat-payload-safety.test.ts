import { describe, expect, test } from "bun:test";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import {
  CreateChatPayloadSafetyError,
  assertSafeCreateChatPayload,
  assertSafeCreateToolResult,
} from "./create-chat-payload-safety.js";

describe("Create orchestration payload safety", () => {
  test("accepts compact text-only chat payloads", () => {
    const result = assertSafeCreateChatPayload([
      new SystemMessage("Create assistant"),
      new HumanMessage("Create a thumbnail with @jonathan"),
    ]);
    expect(result.totalTextChars).toBeGreaterThan(0);
    expect(result.estimatedInputTokens).toBeGreaterThan(0);
  });

  test("rejects data URI image payloads", () => {
    expect(() =>
      assertSafeCreateChatPayload([
        new HumanMessage("data:image/png;base64,iVBORw0KGgo="),
      ]),
    ).toThrow(CreateChatPayloadSafetyError);
  });

  test("rejects image-shaped content and oversized tool results", () => {
    expect(() =>
      assertSafeCreateChatPayload([
        new HumanMessage({
          content: [{ type: "image_url", image_url: { url: "https://example.test/a.png" } }],
        }),
      ]),
    ).toThrow(CreateChatPayloadSafetyError);
    expect(() => assertSafeCreateToolResult("a".repeat(32_001))).toThrow(
      CreateChatPayloadSafetyError,
    );
  });
});
