import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";

import {
  defaultAssetFileName,
  uploadWorkspaceAssetFile,
} from "@/features/workspace/utils/upload-workspace-asset";
import { getMediaUrl } from "@/global/utils/media-url";

export function createPralayWorkspaceAttachmentAdapter(
  workspaceId: string,
  projectId: string,
): AttachmentAdapter {
  return {
    accept: "image/jpeg,image/png,image/webp",

    async add({ file }): Promise<PendingAttachment> {
      return {
        id: crypto.randomUUID(),
        type: "image",
        name: file.name,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      const file = attachment.file;
      if (!file) {
        throw new Error("Missing file for attachment upload.");
      }

      const asset = await uploadWorkspaceAssetFile(workspaceId, {
        file,
        name: defaultAssetFileName(file),
        projectId,
      });

      const image = getMediaUrl(asset.s3Key) ?? "";
      if (!image) {
        throw new Error("Uploaded asset is not ready yet. Try again in a moment.");
      }

      return {
        ...attachment,
        status: { type: "complete" },
        content: [{ type: "image", image }],
      };
    },

    async remove() {},
  };
}
