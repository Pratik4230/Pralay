import { assistantMessageListCursorPayloadSchema } from "@repo/validators";

export class AssistantMessageListCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "AssistantMessageListCursorError";
  }
}

export function encodeAssistantMessageListCursor(input: {
  createdAt: Date;
  id: string;
}) {
  const payload = assistantMessageListCursorPayloadSchema.parse({
    createdAt: input.createdAt.toISOString(),
    id: input.id,
  });

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeAssistantMessageListCursor(cursor: string) {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = assistantMessageListCursorPayloadSchema.safeParse(
      JSON.parse(raw),
    );

    if (!parsed.success) {
      throw new AssistantMessageListCursorError();
    }

    return {
      createdAt: new Date(parsed.data.createdAt),
      id: parsed.data.id,
    };
  } catch (error) {
    if (error instanceof AssistantMessageListCursorError) {
      throw error;
    }

    throw new AssistantMessageListCursorError();
  }
}
