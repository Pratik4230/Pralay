import type { AssistantRun, AssistantRunEvent } from "@repo/validators";

import { fetchProjectAssistantRunEvents } from "./fetch-project-assistant";

export type FollowProjectAssistantRunHandlers = {
  signal?: AbortSignal;
  onReset?: () => void;
  onProgress?: (label: string) => void;
  onTextDelta?: (delta: string, fullText: string) => void;
  onGeneration?: (event: AssistantRunEvent) => void;
  onCompleted?: (run: AssistantRun) => void;
  onFailed?: (message: string, run: AssistantRun) => void;
  onCancelled?: (run: AssistantRun) => void;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function waitForNextPoll(signal?: AbortSignal, milliseconds = 500) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function followProjectAssistantRun(
  workspaceId: string,
  projectId: string,
  runId: string,
  handlers: FollowProjectAssistantRunHandlers,
) {
  let afterSequence = 0;
  let fullText = "";
  let consecutiveFailures = 0;

  while (!handlers.signal?.aborted) {
    try {
      const result = await fetchProjectAssistantRunEvents(
        workspaceId,
        projectId,
        runId,
        afterSequence,
      );
      consecutiveFailures = 0;

      for (const event of result.events) {
        afterSequence = Math.max(afterSequence, event.sequence);
        switch (event.type) {
          case "reset":
            fullText = "";
            handlers.onReset?.();
            break;
          case "progress": {
            const label = event.payload.label;
            if (typeof label === "string") handlers.onProgress?.(label);
            break;
          }
          case "text_delta": {
            const delta = event.payload.delta;
            if (typeof delta === "string") {
              fullText += delta;
              handlers.onTextDelta?.(delta, fullText);
            }
            break;
          }
          case "generation":
            handlers.onGeneration?.(event);
            break;
          case "failed": {
            const message = event.payload.message;
            handlers.onFailed?.(
              typeof message === "string"
                ? message
                : "The assistant run failed.",
              result.run,
            );
            break;
          }
          case "cancelled":
            handlers.onCancelled?.(result.run);
            break;
          case "completed":
          case "status":
            break;
        }
      }

      // Drain every persisted event before honoring the terminal run state.
      // The API pages at 250 events, so a reconnect cannot skip late deltas.
      if (
        TERMINAL_STATUSES.has(result.run.status) &&
        result.events.length < 250
      ) {
        if (result.run.status === "completed") {
          handlers.onCompleted?.(result.run);
        } else if (
          result.run.status === "failed" &&
          result.events.length === 0
        ) {
          handlers.onFailed?.(
            result.run.errorMessage ?? "The assistant run failed.",
            result.run,
          );
        } else if (
          result.run.status === "cancelled" &&
          result.events.length === 0
        ) {
          handlers.onCancelled?.(result.run);
        }
        return result.run;
      }

      await waitForNextPoll(handlers.signal);
    } catch (error) {
      if (handlers.signal?.aborted) throw error;
      consecutiveFailures += 1;
      if (consecutiveFailures >= 5) throw error;
      await waitForNextPoll(
        handlers.signal,
        Math.min(4_000, 500 * 2 ** consecutiveFailures),
      );
    }
  }

  throw new DOMException("Aborted", "AbortError");
}
