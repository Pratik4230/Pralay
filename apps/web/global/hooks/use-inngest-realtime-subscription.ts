"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "inngest/realtime";

import { realtimeSubscriptionTokenSchema } from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

type RealtimeSubscription = {
  close: (reason?: string) => void;
};

type UseInngestRealtimeSubscriptionOptions = {
  enabled: boolean;
  tokenUrl: string;
  onMessage: (data: unknown) => void;
  onConnected?: () => void;
};

export function useInngestRealtimeSubscription({
  enabled,
  tokenUrl,
  onMessage,
  onConnected,
}: UseInngestRealtimeSubscriptionOptions) {
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let connecting = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: RealtimeSubscription | undefined;

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
        const token = realtimeSubscriptionTokenSchema.parse(
          await fetchApiClient(tokenUrl),
        );
        const nextSubscription = await subscribe({
          channel: token.channel,
          topics: token.topics,
          key: token.key,
          ...(token.apiBaseUrl ? { apiBaseUrl: token.apiBaseUrl } : {}),
          onMessage: (message: { data: unknown }) =>
            onMessageRef.current(message.data),
          onError: () => {
            subscription?.close("reconnecting");
            subscription = undefined;
            scheduleReconnect();
          },
        });
        if (stopped) {
          nextSubscription.close("component unmounted");
          return;
        }
        subscription = nextSubscription;
        retryAttempt = 0;
        onConnectedRef.current?.();
      } catch {
        scheduleReconnect();
      } finally {
        connecting = false;
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      subscription?.close("component unmounted");
    };
  }, [enabled, tokenUrl]);
}
