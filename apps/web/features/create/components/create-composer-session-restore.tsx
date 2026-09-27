"use client";

import { useEffect, useRef, type FC } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";

import { CREATE_DRAFT_ZUSTAND_SYNC_MS } from "@/features/create/constants/create-timing";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { restoreComposerLibraryAttachments } from "@/features/create/utils/restore-composer-library-attachments";

type CreateComposerSessionRestoreProps = {
  workspaceId: string;
  projectId: string;
};

export const CreateComposerSessionRestore: FC<
  CreateComposerSessionRestoreProps
> = ({ workspaceId, projectId }) => {
  const aui = useAui();
  const setDraft = useCreateProjectStore((state) => state.setDraft);
  const composerText = useAuiState((state) => state.composer.text);
  const lastProjectId = useRef<string | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringRef = useRef(false);

  useEffect(() => {
    if (lastProjectId.current === projectId) return;
    lastProjectId.current = projectId;

    const draft =
      useCreateProjectStore.getState().byProject[projectId]?.session.draft ??
      "";
    aui.composer.setText(draft);

    if (restoringRef.current) return;
    restoringRef.current = true;
    void restoreComposerLibraryAttachments(workspaceId, projectId, aui).finally(
      () => {
        restoringRef.current = false;
      },
    );
  }, [projectId, workspaceId, aui]);

  useEffect(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      setDraft(projectId, composerText);
    }, CREATE_DRAFT_ZUSTAND_SYNC_MS);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [composerText, projectId, setDraft]);

  useEffect(() => {
    return () => {
      setDraft(projectId, aui.composer.getState().text);
    };
  }, [projectId, aui, setDraft]);

  return null;
};
