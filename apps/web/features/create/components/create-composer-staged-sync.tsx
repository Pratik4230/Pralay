"use client";

import { useEffect, type FC } from "react";
import { useAuiState } from "@assistant-ui/react";

import { CREATE_MENTION_ATTACHMENT_SYNC_MS } from "@/features/create/constants/create-timing";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { textIncludesAssetMention } from "@/features/create/utils/create-asset-mention-sync";

type CreateComposerStagedSyncProps = {
  projectId: string;
};

/** Drop staged library refs when their `@name` token is removed from the prompt. */
export const CreateComposerStagedSync: FC<CreateComposerStagedSyncProps> = ({
  projectId,
}) => {
  const text = useAuiState((state) => state.composer.text);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const staged =
        useCreateProjectStore.getState().byProject[projectId]?.stagedAssets ??
        [];
      if (staged.length === 0) return;

      const next = staged.filter((asset) =>
        textIncludesAssetMention(text, asset.name),
      );
      if (next.length === staged.length) return;

      useCreateProjectStore.getState().setStagedAssets(projectId, () => next);
    }, CREATE_MENTION_ATTACHMENT_SYNC_MS);

    return () => window.clearTimeout(timer);
  }, [projectId, text]);

  return null;
};
