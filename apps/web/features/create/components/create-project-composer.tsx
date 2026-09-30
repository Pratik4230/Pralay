"use client";

import type { FC } from "react";

import { CreateComposerAssetMentions } from "@/features/create/components/create-composer-asset-mentions";
import { CreateComposerStagedSync } from "@/features/create/components/create-composer-staged-sync";
import { CreateComposerCaretProvider } from "@/features/create/components/create-composer-caret-context";
import { CreateProjectThreadComposer } from "@/features/create/components/create-project-thread-composer";

export function createCreateProjectComposer(
  workspaceId: string,
  projectId: string,
): FC<{ autoFocus: boolean }> {
  return function CreateProjectComposer({ autoFocus }: { autoFocus: boolean }) {
    return (
      <CreateComposerCaretProvider>
        <div className="relative">
          <CreateComposerAssetMentions
            workspaceId={workspaceId}
            projectId={projectId}
          />
          <CreateComposerStagedSync projectId={projectId} />
          <CreateProjectThreadComposer
            autoFocus={autoFocus}
            projectId={projectId}
            workspaceId={workspaceId}
          />
        </div>
      </CreateComposerCaretProvider>
    );
  };
}
