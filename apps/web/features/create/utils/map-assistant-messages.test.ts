import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { AssistantMessage } from "@repo/validators";

import { mapAssistantMessagesToCreateMessages } from "./map-assistant-messages";

function message(
  id: string,
  role: AssistantMessage["role"],
  content: string,
  generationId: string | null = null,
): AssistantMessage {
  return {
    id,
    threadId: "thread",
    role,
    content,
    referenceAssetIds: [],
    generationId,
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

describe("Create assistant message mapping", () => {
  test("hides a legacy acknowledgement after a generation turn", () => {
    const mapped = mapAssistantMessagesToCreateMessages(
      new QueryClient(),
      "workspace",
      [
        message("user-1", "user", "Create it", "generation-1"),
        message("assistant-1", "assistant", "Queued. It is in progress."),
      ],
    );

    expect(mapped.map((item) => item.id)).toEqual(["user-1"]);
  });

  test("keeps ordinary assistant conversation", () => {
    const mapped = mapAssistantMessagesToCreateMessages(
      new QueryClient(),
      "workspace",
      [
        message("user-1", "user", "What can you do?"),
        message("assistant-1", "assistant", "I can help create images."),
      ],
    );

    expect(mapped.map((item) => item.id)).toEqual(["user-1", "assistant-1"]);
  });

  test("hides legacy queued text even when the old turn was not linked", () => {
    const mapped = mapAssistantMessagesToCreateMessages(
      new QueryClient(),
      "workspace",
      [
        message("user-1", "user", "Yes, do it"),
        message(
          "assistant-1",
          "assistant",
          "Queued. Progress will appear here.",
        ),
      ],
    );

    expect(mapped.map((item) => item.id)).toEqual(["user-1"]);
  });
});
