import {
  assistantMessageStreamEventSchema,
  type SendProjectAssistantMessageBodyInput,
} from "@repo/validators";

import { env } from "@/global/utils/env";
import { ApiRequestError } from "@/global/utils/api-client";

export type StreamProjectAssistantHandlers = {
  onMeta: (
    event: Extract<
      ReturnType<typeof assistantMessageStreamEventSchema.parse>,
      { type: "meta" }
    >,
  ) => void;
  onTextDelta: (delta: string, fullText: string) => void;
  onDone: (
    event: Extract<
      ReturnType<typeof assistantMessageStreamEventSchema.parse>,
      { type: "done" }
    >,
  ) => void;
  onError: (message: string) => void;
  onGeneration?: (
    event: Extract<
      ReturnType<typeof assistantMessageStreamEventSchema.parse>,
      { type: "generation" }
    >,
  ) => void;
  signal?: AbortSignal;
};

export type StreamProjectAssistantResult = {
  completed: boolean;
  threadId?: string;
};

export function processProjectAssistantStreamLine(
  line: string,
  handlers: StreamProjectAssistantHandlers,
  fullTextRef: { value: string },
  threadIdRef: { value?: string },
): boolean {
  if (!line.trim()) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(line);
  } catch (error) {
    throw new Error("Assistant stream returned invalid JSON", { cause: error });
  }

  const parsed = assistantMessageStreamEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Assistant stream returned an invalid event: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`,
    );
  }

  if (parsed.data.type === "ping") {
    return false;
  }

  switch (parsed.data.type) {
    case "meta":
      threadIdRef.value = parsed.data.thread.id;
      handlers.onMeta(parsed.data);
      break;
    case "generation":
      handlers.onGeneration?.(parsed.data);
      break;
    case "text":
      fullTextRef.value += parsed.data.delta;
      handlers.onTextDelta(parsed.data.delta, fullTextRef.value);
      break;
    case "done":
      threadIdRef.value = parsed.data.thread.id;
      handlers.onDone(parsed.data);
      return true;
    case "error":
      handlers.onError(parsed.data.message);
      break;
  }
  return false;
}

export async function streamProjectAssistantMessage(
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBodyInput,
  handlers: StreamProjectAssistantHandlers,
): Promise<StreamProjectAssistantResult> {
  const response = await fetch(
    `${env.appUrl}/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/messages/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      signal: handlers.signal,
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiRequestError(
      response.status,
      errorBody?.error?.message ?? response.statusText,
    );
  }

  if (!response.body) {
    throw new Error("Streaming response had no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const fullTextRef = { value: "" };
  let completed = false;
  const threadIdRef: { value?: string } = {};

  const handleLine = (line: string) => {
    if (
      processProjectAssistantStreamLine(
        line,
        handlers,
        fullTextRef,
        threadIdRef,
      )
    ) {
      completed = true;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        handleLine(line);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      handleLine(buffer);
    }
  } catch (error) {
    throw error;
  }

  return { completed, threadId: threadIdRef.value };
}
