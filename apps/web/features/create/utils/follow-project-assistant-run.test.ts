import { afterAll, describe, expect, mock, test } from "bun:test";

import type { AssistantRun, AssistantRunEvent } from "@repo/validators";

let subscriptionOptions:
  | {
      onMessage: (message: { data: unknown }) => void;
      onError: () => void;
    }
  | undefined;
const closeSubscription = mock(() => undefined);
const fetchEvents = mock(async () => ({
  run: run("processing"),
  events: [event(1, "status", { status: "processing" })],
}));

mock.module("inngest/realtime", () => ({
  subscribe: async (options: typeof subscriptionOptions) => {
    subscriptionOptions = options;
    return { close: closeSubscription };
  },
}));

mock.module("./fetch-project-assistant", () => ({
  fetchProjectAssistantRunEvents: fetchEvents,
  fetchProjectAssistantRunRealtimeToken: async () => ({
    key: "test-key",
    channel: "assistant-run:test-run",
    topics: ["event"],
  }),
}));

const { followProjectAssistantRun } =
  await import("./follow-project-assistant-run");

function run(status: AssistantRun["status"]): AssistantRun {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    threadId: "22222222-2222-4222-8222-222222222222",
    userMessageId: "33333333-3333-4333-8333-333333333333",
    assistantMessageId:
      status === "completed" ? "44444444-4444-4444-8444-444444444444" : null,
    status,
    outcome: status === "completed" ? "assistant_message" : null,
    errorMessage: null,
    attemptCount: 1,
    cancelRequestedAt: null,
    startedAt: "2026-10-31T00:00:00.000Z",
    completedAt: status === "completed" ? "2026-10-31T00:00:01.000Z" : null,
    createdAt: "2026-10-31T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:01.000Z",
  };
}

function event(
  sequence: number,
  type: AssistantRunEvent["type"],
  payload: Record<string, unknown>,
): AssistantRunEvent {
  return {
    id: `${sequence.toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
    runId: "11111111-1111-4111-8111-111111111111",
    sequence,
    type,
    payload,
    createdAt: "2026-10-31T00:00:01.000Z",
  };
}

describe("followProjectAssistantRun", () => {
  test("reconciles once and then waits for realtime instead of polling", async () => {
    const onTextDelta = mock(() => undefined);
    const onCompleted = mock(() => undefined);
    const following = followProjectAssistantRun(
      "workspace",
      "project",
      "11111111-1111-4111-8111-111111111111",
      { onTextDelta, onCompleted },
    );

    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(fetchEvents).toHaveBeenCalledTimes(1);

    subscriptionOptions?.onMessage({
      data: {
        run: run("processing"),
        event: event(2, "text_delta", { delta: "Done" }),
      },
    });
    subscriptionOptions?.onMessage({
      data: {
        run: run("completed"),
        event: event(3, "completed", {
          outcome: "assistant_message",
          assistantMessageId: "44444444-4444-4444-8444-444444444444",
        }),
      },
    });

    await expect(following).resolves.toMatchObject({ status: "completed" });
    expect(onTextDelta).toHaveBeenCalledWith("Done", "Done");
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(closeSubscription).toHaveBeenCalledTimes(1);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => mock.restore());
