import type { AppendMessage } from "@assistant-ui/react";

import type { CreateAttachedAsset } from "@/features/create/types/create-ui";
import { parseMediaKeyFromUrl } from "@/global/utils/media-url";

export function mergeCreateSendAttachments(
  stagedLibraryAssets: CreateAttachedAsset[],
  message: AppendMessage,
): CreateAttachedAsset[] {
  const merged = [...stagedLibraryAssets];
  const knownIds = new Set(stagedLibraryAssets.map((asset) => asset.id));

  for (const attachment of message.attachments ?? []) {
    if (knownIds.has(attachment.id)) continue;

    const imagePart = attachment.content?.find(
      (part): part is { type: "image"; image: string } =>
        part.type === "image" && typeof part.image === "string",
    );
    if (!imagePart?.image) continue;

    const s3Key = parseMediaKeyFromUrl(imagePart.image) ?? attachment.id;
    merged.push({
      id: attachment.id,
      name: attachment.name,
      s3Key,
      scope: "project",
    });
    knownIds.add(attachment.id);
  }

  return merged;
}
