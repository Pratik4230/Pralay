"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { WorkspaceSettingsPanel } from "@/features/workspace/components/workspace-settings-panel";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

export function WorkspaceSettingsPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarUploadFailed = searchParams.get("avatarUpload") === "failed";
  const avatarUploadMessage = searchParams.get("message");
  const { data, isLoading, error } = useWorkspace(workspaceId);

  useEffect(() => {
    if (avatarUploadFailed) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [avatarUploadFailed]);

  if (isLoading) {
    return (
      <WorkspaceSectionShell title="Settings">
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </WorkspaceSectionShell>
    );
  }

  if (error || !data) {
    return (
      <WorkspaceSectionShell title="Settings">
        <p className="text-sm text-destructive">
          {error?.message ?? "Workspace not found"}
        </p>
      </WorkspaceSectionShell>
    );
  }

  if (!canManageWorkspace(data.membership.role)) {
    return (
      <WorkspaceSectionShell title="Settings">
        <p className="text-sm text-muted-foreground">
          You do not have permission to manage workspace settings.
        </p>
      </WorkspaceSectionShell>
    );
  }

  const { workspace, membership } = data;

  return (
    <WorkspaceSectionShell
      title="Settings"
      description="Update workspace details, media, and lifecycle."
    >
      {avatarUploadFailed ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">
            Workspace created, but the image did not upload.
          </p>
          {avatarUploadMessage ? (
            <p className="mt-1 text-destructive/90">{avatarUploadMessage}</p>
          ) : null}
        </div>
      ) : null}

      <WorkspaceSettingsPanel
        workspaceId={workspaceId}
        name={workspace.name}
        slug={workspace.slug}
        description={workspace.description}
        avatarKey={workspace.avatarKey}
        role={membership.role}
        onDeleted={() => router.push("/dashboard")}
      />
    </WorkspaceSectionShell>
  );
}
