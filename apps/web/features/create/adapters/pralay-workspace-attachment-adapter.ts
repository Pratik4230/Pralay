import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";

import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import {
  defaultAssetFileName,
  uploadWorkspaceAssetFile,
} from "@/features/workspace/utils/upload-workspace-asset";
import { getMediaUrl } from "@/global/utils/media-url";
import { normalizeWorkspaceAssetDisplayNameOrDefault } from "@repo/validators/asset";

export function createPralayWorkspaceAttachmentAdapter(
  workspaceId: string,
  projectId: string,
): AttachmentAdapter {
  return {
    accept: "image/jpeg,image/png,image/webp",

    async add({ file }): Promise<PendingAttachment> {
      const id = crypto.randomUUID();
      const defaultName = defaultAssetFileName(file);

      return {
        id,
        type: "image",
        name: defaultName,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      const file = attachment.file;
      if (!file) {
        throw new Error("Missing file for attachment upload.");
      }

      const storedName =
        useCreateProjectStore.getState().getComposerUploadName(
          projectId,
          attachment.id,
        ) ?? attachment.name;

      const asset = await uploadWorkspaceAssetFile(workspaceId, {
        file,
        name: normalizeWorkspaceAssetDisplayNameOrDefault(storedName),
        projectId,
      });

      const image = getMediaUrl(asset.s3Key) ?? "";
      if (!image) {
        throw new Error("Uploaded asset is not ready yet. Try again in a moment.");
      }

      useCreateProjectStore.getState().setStagedAssets(projectId, (current) => {
        if (current.some((item) => item.id === asset.id)) {
          return current;
        }
        return [
          ...current,
          {
            id: asset.id,
            name: asset.name,
            s3Key: asset.s3Key,
            scope: "project" as const,
          },
        ];
      });

      return {
        ...attachment,
        id: asset.id,
        name: asset.name,
        status: { type: "complete" },
        content: [{ type: "image", image }],
      };
    },

    async remove(attachment) {
      useCreateProjectStore
        .getState()
        .removeComposerUploadName(projectId, attachment.id);
    },
  };
}
