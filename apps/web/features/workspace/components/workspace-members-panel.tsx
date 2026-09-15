"use client";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  FieldError,
} from "@repo/ui/components/field";

import { WorkspaceRoleBadge } from "@/features/workspace/components/workspace-role-badge";
import {
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMember,
  useWorkspaceMembers,
} from "@/features/workspace/hooks/use-workspace-members";
import type { WorkspaceRole } from "@/features/workspace/types";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

type WorkspaceMembersPanelProps = {
  workspaceId: string;
  role: WorkspaceRole;
  currentUserId: string;
};

export function WorkspaceMembersPanel({
  workspaceId,
  role,
  currentUserId,
}: WorkspaceMembersPanelProps) {
  const membersQuery = useWorkspaceMembers(workspaceId);
  const updateMember = useUpdateWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  const canManage = canManageWorkspace(role);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          People who have access to this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {membersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading members...</p>
        ) : null}
        {membersQuery.error ? (
          <FieldError>{membersQuery.error.message}</FieldError>
        ) : null}
        {(membersQuery.data?.members.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No members found.</p>
        ) : (
          <div className="grid gap-3">
            {membersQuery.data?.members.map((member) => {
              const isSelf = member.user.id === currentUserId;
              const canEditMember =
                canManage &&
                member.role !== "owner" &&
                !(role === "admin" && member.role === "admin");

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name}
                      {isSelf ? " (You)" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEditMember ? (
                      <select
                        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                        value={member.role === "owner" ? "member" : member.role}
                        disabled={updateMember.isPending}
                        onChange={(event) =>
                          updateMember.mutate({
                            memberId: member.id,
                            body: {
                              role: event.target.value as "admin" | "member",
                            },
                          })
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <WorkspaceRoleBadge role={member.role} />
                    )}
                    {canEditMember ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={removeMember.isPending}
                        onClick={() => removeMember.mutate(member.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
