"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import { WorkspaceInvitesPanel } from "@/features/workspace/components/workspace-invites-panel";
import { WorkspaceMembersPanel } from "@/features/workspace/components/workspace-members-panel";
import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { WorkspaceRoleBadge } from "@/features/workspace/components/workspace-role-badge";
import { WorkspaceSettingsPanel } from "@/features/workspace/components/workspace-settings-panel";
import { useMe } from "@/features/workspace/hooks/use-me";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

type WorkspaceTab = "members" | "invites" | "settings";

export function WorkspaceDetailPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>("members");
  const workspaceQuery = useWorkspace(workspaceId);
  const meQuery = useMe();

  if (workspaceQuery.isLoading || meQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (workspaceQuery.error || !workspaceQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-destructive">
          {workspaceQuery.error?.message ?? "Workspace not found"}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const { workspace, membership } = workspaceQuery.data;
  const currentUserId = meQuery.data?.user.id ?? "";
  const tabs: WorkspaceTab[] = canManageWorkspace(membership.role)
    ? ["members", "invites", "settings"]
    : ["members"];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="w-fit px-0">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <div className="flex items-start gap-4">
          <WorkspaceAvatar
            name={workspace.name}
            avatarKey={workspace.avatarKey}
            className="size-14 text-base"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {workspace.name}
              </h1>
              <WorkspaceRoleBadge role={membership.role} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{workspace.slug}</p>
            {workspace.description ? (
              <p className="mt-3 text-sm">{workspace.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={tab === item ? "default" : "outline"}
            onClick={() => setTab(item)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      <div>
        {tab === "members" ? (
          <WorkspaceMembersPanel
            workspaceId={workspaceId}
            role={membership.role}
            currentUserId={currentUserId}
          />
        ) : null}
        {tab === "invites" ? (
          <WorkspaceInvitesPanel
            workspaceId={workspaceId}
            role={membership.role}
          />
        ) : null}
        {tab === "settings" ? (
          <WorkspaceSettingsPanel
            workspaceId={workspaceId}
            name={workspace.name}
            description={workspace.description}
            avatarKey={workspace.avatarKey}
            role={membership.role}
            onDeleted={() => router.push("/dashboard")}
          />
        ) : null}
      </div>
    </div>
  );
}
