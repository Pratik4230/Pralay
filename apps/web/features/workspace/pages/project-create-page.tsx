"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { CreateChatPanel } from "@/features/create/components/create-chat-panel";
import { CreateProjectAssetsRow } from "@/features/create/components/create-project-assets-row";
import { CreatePromptHero } from "@/features/create/components/create-prompt-hero";
import { CreateRecentSidebar } from "@/features/create/components/create-recent-sidebar";
import { CreateThreadSelector } from "@/features/create/components/create-thread-selector";
import { useCreateAssetOptions } from "@/features/create/hooks/use-create-asset-options";
import { useProjectCreateUi } from "@/features/create/hooks/use-project-create-ui";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";
import type { CreateAttachedAsset } from "@/features/create/types/create-ui";

type ProjectCreatePageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectCreatePage({
  workspaceId,
  projectId,
}: ProjectCreatePageProps) {
  const router = useRouter();
  const projectQuery = useWorkspaceProject(workspaceId, projectId);
  const { options: assetOptions, isLoading: assetsLoading } =
    useCreateAssetOptions(workspaceId, projectId);

  const {
    hydrated,
    threads,
    activeThread,
    activeThreadId,
    session,
    recentCreations,
    createThread,
    selectThread,
    submitPrompt,
    toggleReferenceAsset,
    setDraft,
    setChatModel,
  } = useProjectCreateUi(projectId);

  const referenceNames = useMemo(
    () =>
      session.referenceAssetIds
        .map((id) => assetOptions.find((option) => option.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [session.referenceAssetIds, assetOptions],
  );

  if (projectQuery.isLoading || !hydrated) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (projectQuery.error || !projectQuery.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        {projectQuery.error?.message ?? "Project not found"}
      </div>
    );
  }

  const messages = activeThread?.messages ?? [];
  const showThread = messages.length > 0;
  const assetsPath = `${getProjectBasePath(workspaceId, projectId)}/assets`;

  function handleGenerate(attachments: CreateAttachedAsset[]) {
    submitPrompt(session.draft, attachments, referenceNames);
    setDraft("");
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <CreateThreadSelector
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={selectThread}
          onCreate={createThread}
        />
        <p className="truncate text-xs text-muted-foreground">
          {projectQuery.data.project.name}
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {showThread ? (
            <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
              <CreateChatPanel
                messages={messages}
                projectName={activeThread?.title ?? "Conversation"}
                compact
              />
            </div>
          ) : null}

          <CreatePromptHero
            session={session}
            assetOptions={assetOptions}
            onDraftChange={setDraft}
            onChatModelChange={setChatModel}
            onGenerate={handleGenerate}
            onQuickSuggestion={setDraft}
            onOpenProjectAssets={() => router.push(assetsPath)}
          />

          <CreateProjectAssetsRow
            workspaceId={workspaceId}
            projectId={projectId}
            options={assetOptions}
            selectedIds={session.referenceAssetIds}
            onToggle={toggleReferenceAsset}
            isLoading={assetsLoading}
          />
        </div>

        <CreateRecentSidebar items={recentCreations} />
      </div>
    </div>
  );
}
