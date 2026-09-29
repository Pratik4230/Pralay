"use client";

import type { FC } from "react";

import { CreateComposerAssetMentions } from "@/features/create/components/create-composer-asset-mentions";
import { CreateComposerAttachmentSync } from "@/features/create/components/create-composer-attachment-sync";
import { CreateProjectThreadComposer } from "@/features/create/components/create-project-thread-composer";

export function createCreateProjectComposer(
  workspaceId: string,
  projectId: string,
): FC<{ autoFocus: boolean }> {
  return function CreateProjectComposer({ autoFocus }: { autoFocus: boolean }) {
    return (
      <div className="relative">
        <CreateComposerAssetMentions
          workspaceId={workspaceId}
          projectId={projectId}
        />
        <CreateComposerAttachmentSync projectId={projectId} />
        <CreateProjectThreadComposer autoFocus={autoFocus} projectId={projectId} />
      </div>
    );
  };
}
