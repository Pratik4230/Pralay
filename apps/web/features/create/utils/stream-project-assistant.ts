import {
  assistantMessageStreamEventSchema,
  type SendProjectAssistantMessageBodyInput,
} from "@repo/validators";

import { env } from "@/global/utils/env";
import { ApiRequestError } from "@/global/utils/api-client";

export type StreamProjectAssistantHandlers = {
  onMeta: (event: Extract<
    ReturnType<typeof assistantMessageStreamEventSchema.parse>,
    { type: "meta" }
  >) => void;
  onTextDelta: (delta: string, fullText: string) => void;
  onDone: (event: Extract<
    ReturnType<typeof assistantMessageStreamEventSchema.parse>,
    { type: "done" }
  >) => void;
  onError: (message: string) => void;
  onGeneration?: (event: Extract<
    ReturnType<typeof assistantMessageStreamEventSchema.parse>,
    { type: "generation" }
  >) => void;
  signal?: AbortSignal;
};

export async function streamProjectAssistantMessage(
  workspaceId: string,
  projectId: string,
  body: SendProjectAssistantMessageBodyInput,
  handlers: StreamProjectAssistantHandlers,
) {
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
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = assistantMessageStreamEventSchema.safeParse(
        JSON.parse(line),
      );
      if (!parsed.success) continue;

      switch (parsed.data.type) {
        case "meta":
          handlers.onMeta(parsed.data);
          break;
        case "generation":
          handlers.onGeneration?.(parsed.data);
          break;
        case "text":
          fullText += parsed.data.delta;
          handlers.onTextDelta(parsed.data.delta, fullText);
          break;
        case "done":
          handlers.onDone(parsed.data);
          break;
        case "error":
          handlers.onError(parsed.data.message);
          break;
      }
    }
  }
}
