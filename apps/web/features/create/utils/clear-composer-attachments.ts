import type { AssistantClient } from "@assistant-ui/react";

/** Remove all composer attachment tiles (after send or failed send). */
export async function clearComposerAttachments(aui: AssistantClient) {
  const attachments = aui.composer.getState().attachments;
  await Promise.all(
    attachments.map((attachment) =>
      aui.composer.attachment({ id: attachment.id }).remove(),
    ),
  );
}
