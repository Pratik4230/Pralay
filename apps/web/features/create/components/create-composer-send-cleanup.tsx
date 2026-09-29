"use client";

import { useEffect, type MutableRefObject, type FC } from "react";
import { useAui } from "@assistant-ui/react";

import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { clearComposerAttachments } from "@/features/create/utils/clear-composer-attachments";

type CreateComposerSendCleanupProps = {
  projectId: string;
  cleanupRef: MutableRefObject<(() => Promise<void>) | null>;
};

/** Registers post-send cleanup (composer tiles + staged library refs). */
export const CreateComposerSendCleanup: FC<CreateComposerSendCleanupProps> = ({
  projectId,
  cleanupRef,
}) => {
  const aui = useAui();

  useEffect(() => {
    cleanupRef.current = async () => {
      await clearComposerAttachments(aui);
      useCreateProjectStore.getState().clearStagedAssets(projectId);
    };
    return () => {
      cleanupRef.current = null;
    };
  }, [aui, cleanupRef, projectId]);

  return null;
};
