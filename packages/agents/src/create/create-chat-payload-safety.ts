import type { BaseMessage } from "@langchain/core/messages";

const MAX_TOOL_RESULT_CHARS = 32_000;
const MAX_TEXT_PAYLOAD_CHARS = 96_000;

export class CreateChatPayloadSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateChatPayloadSafetyError";
  }
}

function hasForbiddenMedia(value: unknown): boolean {
  if (typeof value === "string") {
    return /data:[^,;]+(?:;base64)?,/i.test(value) || /base64,/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasForbiddenMedia);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, entry]) =>
        key === "image_url" || key === "input_image" || hasForbiddenMedia(entry),
    );
  }
  return false;
}

function textLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((total, entry) => total + textLength(entry), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (total, entry) => total + textLength(entry),
      0,
    );
  }
  return 0;
}

/** Normal Create orchestration is metadata-only and fails closed for media. */
export function assertSafeCreateChatPayload(messages: BaseMessage[]) {
  const totalTextChars = messages.reduce(
    (total, message) => total + textLength(message.content),
    0,
  );

  for (const message of messages) {
    if (hasForbiddenMedia(message.content)) {
      throw new CreateChatPayloadSafetyError(
        "Create orchestration cannot include image or base64 payloads",
      );
    }
  }

  if (totalTextChars > MAX_TEXT_PAYLOAD_CHARS) {
    throw new CreateChatPayloadSafetyError(
      `Create orchestration payload exceeds ${MAX_TEXT_PAYLOAD_CHARS} characters`,
    );
  }

  return { totalTextChars, estimatedInputTokens: Math.ceil(totalTextChars / 4) };
}

export function assertSafeCreateToolResult(output: string) {
  if (output.length > MAX_TOOL_RESULT_CHARS) {
    throw new CreateChatPayloadSafetyError(
      `Create tool result exceeds ${MAX_TOOL_RESULT_CHARS} characters`,
    );
  }
  if (hasForbiddenMedia(output)) {
    throw new CreateChatPayloadSafetyError(
      "Create tool results cannot include image or base64 payloads",
    );
  }
}

export function logCreateChatPayloadTelemetry(input: {
  requestId: string;
  threadId?: string;
  userMessageId?: string;
  iteration: number;
  totalTextChars: number;
  estimatedInputTokens: number;
  toolResultChars: number;
  inputTokens?: number;
  outputTokens?: number;
  rateLimits?: Record<string, string>;
}) {
  console.info("[create-assistant] openai-payload", input);
}
