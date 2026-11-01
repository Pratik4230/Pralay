import { subscribe } from "inngest/realtime";

import {
  assistantRunRealtimeEventSchema,
  type AssistantRun,
  type AssistantRunEvent,
} from "@repo/validators";

import {
  fetchProjectAssistantRunEvents,
  fetchProjectAssistantRunRealtimeToken,
} from "./fetch-project-assistant";

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

type RealtimeSubscription = {
  close: (reason?: string) => void;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const EVENT_PAGE_SIZE = 250;

export function followProjectAssistantRun(
  workspaceId: string,
  projectId: string,
  runId: string,
  handlers: FollowProjectAssistantRunHandlers,
) {
  return new Promise<AssistantRun>((resolve, reject) => {
    let afterSequence = 0;
    let fullText = "";
    let stopped = false;
    let connecting = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: RealtimeSubscription | undefined;
    let reconcilePromise: Promise<void> | undefined;
    const queuedEvents = new Map<
      number,
      { run: AssistantRun; event: AssistantRunEvent }
    >();

    const cleanup = (reason: string) => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      subscription?.close(reason);
      handlers.signal?.removeEventListener("abort", handleAbort);
    };

    const finish = (run: AssistantRun, failureMessage?: string) => {
      if (stopped) return;
      if (run.status === "completed") handlers.onCompleted?.(run);
      else if (run.status === "failed") {
        handlers.onFailed?.(
          failureMessage ?? run.errorMessage ?? "The assistant run failed.",
          run,
        );
      } else if (run.status === "cancelled") handlers.onCancelled?.(run);
      cleanup("assistant run completed");
      resolve(run);
    };

    const applyEvents = (
      run: AssistantRun,
      events: readonly AssistantRunEvent[],
      allowTerminal = true,
    ) => {
      let failureMessage: string | undefined;
      for (const event of [...events].sort(
        (left, right) => left.sequence - right.sequence,
      )) {
        if (event.sequence <= afterSequence) continue;
        afterSequence = event.sequence;
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
            if (typeof message === "string") failureMessage = message;
            break;
          }
          case "completed":
          case "cancelled":
          case "status":
            break;
        }
      }

      if (allowTerminal && TERMINAL_STATUSES.has(run.status)) {
        finish(run, failureMessage);
      }
    };

    const reconcile = () => {
      if (reconcilePromise) return reconcilePromise;
      reconcilePromise = (async () => {
        let latestRun: AssistantRun | undefined;
        while (!stopped) {
          const result = await fetchProjectAssistantRunEvents(
            workspaceId,
            projectId,
            runId,
            afterSequence,
          );
          latestRun = result.run;
          applyEvents(
            result.run,
            result.events,
            result.events.length < EVENT_PAGE_SIZE,
          );
          if (stopped || result.events.length < EVENT_PAGE_SIZE) break;
        }

        if (stopped) return;
        const queued = [...queuedEvents.values()].sort(
          (left, right) => left.event.sequence - right.event.sequence,
        );
        queuedEvents.clear();
        for (const payload of queued) {
          applyEvents(payload.run, [payload.event]);
          if (stopped) return;
          latestRun = payload.run;
        }

        if (latestRun && TERMINAL_STATUSES.has(latestRun.status)) {
          finish(latestRun);
        }
      })().finally(() => {
        reconcilePromise = undefined;
      });
      return reconcilePromise;
    };

    const scheduleReconnect = () => {
      if (stopped || retryTimer) return;
      const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (stopped || connecting) return;
      connecting = true;
      try {
        const token = await fetchProjectAssistantRunRealtimeToken(
          workspaceId,
          projectId,
          runId,
        );
        const nextSubscription = await subscribe({
          channel: token.channel,
          topics: token.topics,
          key: token.key,
          ...(token.apiBaseUrl ? { apiBaseUrl: token.apiBaseUrl } : {}),
          onMessage: (message: { data: unknown }) => {
            const payload = assistantRunRealtimeEventSchema.safeParse(
              message.data,
            );
            if (!payload.success || stopped) return;
            if (reconcilePromise) {
              queuedEvents.set(payload.data.event.sequence, payload.data);
              return;
            }
            applyEvents(payload.data.run, [payload.data.event]);
          },
          onError: () => {
            subscription?.close("reconnecting");
            subscription = undefined;
            scheduleReconnect();
          },
        });
        if (stopped) {
          nextSubscription.close("assistant run completed");
          return;
        }
        subscription = nextSubscription;
        retryAttempt = 0;
        await reconcile();
      } catch (error) {
        if (!stopped) scheduleReconnect();
        if (handlers.signal?.aborted) {
          cleanup("aborted");
          reject(error);
        }
      } finally {
        connecting = false;
      }
    };

    function handleAbort() {
      if (stopped) return;
      cleanup("aborted");
      reject(new DOMException("Aborted", "AbortError"));
    }

    if (handlers.signal?.aborted) {
      handleAbort();
      return;
    }
    handlers.signal?.addEventListener("abort", handleAbort, { once: true });
    void connect();
  });
}
