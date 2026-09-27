import type { ThreadMessageLike } from "@assistant-ui/react";

import type { CreateThreadMessage } from "@/features/create/types/create-ui";
import { getMediaUrl } from "@/global/utils/media-url";

export function convertCreateThreadMessage(
  message: CreateThreadMessage,
): ThreadMessageLike {
  const textPart = { type: "text" as const, text: message.content };
  const imageParts =
    message.role === "user" && message.attachments?.length
      ? message.attachments
          .map((asset) => {
            const image = getMediaUrl(asset.s3Key);
            if (!image) return null;
            return { type: "image" as const, image };
          })
          .filter((part): part is { type: "image"; image: string } => !!part)
      : [];

  const content = imageParts.length
    ? [textPart, ...imageParts]
    : [textPart];

  const base: ThreadMessageLike = {
    id: message.id,
    role: message.role,
    content,
    createdAt: new Date(message.createdAt),
  };

  if (message.role !== "user" || !message.attachments?.length) {
    return base;
  }

  return {
    ...base,
    attachments: message.attachments.map((asset) => {
      const image = getMediaUrl(asset.s3Key) ?? "";
      return {
        id: asset.id,
        type: "image" as const,
        name: asset.name,
        status: { type: "complete" as const },
        content: [{ type: "image" as const, image }],
      };
    }),
  };
}
