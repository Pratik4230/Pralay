import { describe, expect, mock, test } from "bun:test";

import {
  processProjectAssistantStreamLine,
  type StreamProjectAssistantHandlers,
} from "./stream-project-assistant";

function handlers(): StreamProjectAssistantHandlers {
  return {
    onMeta: mock(() => undefined),
    onTextDelta: mock(() => undefined),
    onDone: mock(() => undefined),
    onError: mock(() => undefined),
  };
}

describe("Create assistant stream protocol", () => {
  test("accepts a generation done event with no assistant message", () => {
    const callbacks = handlers();
    const completed = processProjectAssistantStreamLine(
      JSON.stringify({
        type: "done",
        outcome: "generation_started",
        thread: {
          id: "11111111-1111-4111-8111-111111111111",
          workspaceId: "22222222-2222-4222-8222-222222222222",
          projectId: "33333333-3333-4333-8333-333333333333",
          createdBy: "user",
          title: null,
          titleAuto: true,
          summary: null,
          summaryThroughMessageId: null,
          createdAt: "2026-10-05T00:00:00.000Z",
          updatedAt: "2026-10-05T00:00:00.000Z",
        },
        assistantMessage: null,
      }),
      callbacks,
      { value: "" },
      {},
    );

    expect(completed).toBe(true);
    expect(callbacks.onDone).toHaveBeenCalledTimes(1);
  });

  test("rejects malformed and unknown events instead of silently dropping them", () => {
    const callbacks = handlers();
    expect(() =>
      processProjectAssistantStreamLine(
        "not-json",
        callbacks,
        { value: "" },
        {},
      ),
    ).toThrow("invalid JSON");
    expect(() =>
      processProjectAssistantStreamLine(
        JSON.stringify({ type: "done", assistantMessage: null }),
        callbacks,
        { value: "" },
        {},
      ),
    ).toThrow("invalid event");
  });
});
