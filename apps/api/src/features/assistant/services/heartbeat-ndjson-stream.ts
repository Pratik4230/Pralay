export function createHeartbeatNdjsonStream<T>(input: {
  events: AsyncIterable<T>;
  encode: (event: T) => Uint8Array;
  heartbeatEvent: T;
  heartbeatMs: number;
}): ReadableStream<Uint8Array> {
  const iterator = input.events[Symbol.asyncIterator]();
  let cancelled = false;

  const pump = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => {
    try {
      while (true) {
        const heartbeat = setInterval(() => {
          if (cancelled) return;
          try {
            controller.enqueue(input.encode(input.heartbeatEvent));
          } catch {
            cancelled = true;
          }
        }, input.heartbeatMs);

        let next: IteratorResult<T>;
        try {
          next = await iterator.next();
        } finally {
          clearInterval(heartbeat);
        }

        if (next.done) {
          if (!cancelled) controller.close();
          return;
        }
        if (!cancelled) controller.enqueue(input.encode(next.value));
      }
    } catch (error) {
      if (!cancelled) controller.error(error);
    }
  };

  return new ReadableStream({
    start(controller) {
      void pump(controller);
    },
    cancel() {
      // Finish server-side tool calls and persistence even if the response
      // consumer or an intermediary disconnects after the user was persisted.
      cancelled = true;
    },
  });
}
