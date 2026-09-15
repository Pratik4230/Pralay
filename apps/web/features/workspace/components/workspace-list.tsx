"use client";

import Link from "next/link";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { WorkspaceRoleBadge } from "@/features/workspace/components/workspace-role-badge";
import { useWorkspaces } from "@/features/workspace/hooks/use-workspaces";

export function WorkspaceList({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  const { data, isLoading, error } = useWorkspaces();

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Loading workspaces...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-10">
          <FieldErrorMessage message={error.message} />
        </CardContent>
      </Card>
    );
  }

  const workspaces = data?.workspaces ?? [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Your workspaces</CardTitle>
          <CardDescription>
            Open a workspace to manage members, invites, and settings.
          </CardDescription>
        </div>
        <Button onClick={onCreateClick}>New workspace</Button>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You do not have any workspaces yet.
            </p>
            <Button className="mt-4" onClick={onCreateClick}>
              Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/dashboard/workspaces/${workspace.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <WorkspaceAvatar
                    name={workspace.name}
                    avatarKey={workspace.avatarKey}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{workspace.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {workspace.slug}
                    </p>
                  </div>
                </div>
                <WorkspaceRoleBadge role={workspace.role} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldErrorMessage({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}
