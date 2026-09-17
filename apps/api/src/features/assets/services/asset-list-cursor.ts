import { workspaceAssetListCursorPayloadSchema } from "@repo/validators";

export class AssetListCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "AssetListCursorError";
  }
}

export function encodeAssetListCursor(input: { createdAt: Date; id: string }) {
  const payload = workspaceAssetListCursorPayloadSchema.parse({
    createdAt: input.createdAt.toISOString(),
    id: input.id,
  });

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeAssetListCursor(cursor: string) {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = workspaceAssetListCursorPayloadSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      throw new AssetListCursorError();
    }

    return {
      createdAt: new Date(parsed.data.createdAt),
      id: parsed.data.id,
    };
  } catch (error) {
    if (error instanceof AssetListCursorError) {
      throw error;
    }

    throw new AssetListCursorError();
  }
}
