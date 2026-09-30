"use client";

import { useEffect, type MutableRefObject, type FC } from "react";

import { useCreateProjectStore } from "@/features/create/store/create-project-store";

type CreateComposerSendCleanupProps = {
  projectId: string;
  cleanupRef: MutableRefObject<(() => Promise<void>) | null>;
};

/** Clears staged `@` references after send. */
export const CreateComposerSendCleanup: FC<CreateComposerSendCleanupProps> = ({
  projectId,
  cleanupRef,
}) => {
  useEffect(() => {
    cleanupRef.current = async () => {
      useCreateProjectStore.getState().clearStagedAssets(projectId);
    };
    return () => {
      cleanupRef.current = null;
    };
  }, [cleanupRef, projectId]);

  return null;
};
