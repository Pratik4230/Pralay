import { workspaceListCursorPayloadSchema } from "@repo/validators";

export class WorkspaceListCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "WorkspaceListCursorError";
  }
}

export function encodeWorkspaceListCursor(input: {
  updatedAt: Date;
  id: string;
}) {
  const payload = workspaceListCursorPayloadSchema.parse({
    updatedAt: input.updatedAt.toISOString(),
    id: input.id,
  });

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeWorkspaceListCursor(cursor: string) {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = workspaceListCursorPayloadSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      throw new WorkspaceListCursorError();
    }

    return {
      updatedAt: new Date(parsed.data.updatedAt),
      id: parsed.data.id,
    };
  } catch (error) {
    if (error instanceof WorkspaceListCursorError) {
      throw error;
    }

    throw new WorkspaceListCursorError();
  }
}
