"use client";

import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Form,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { createWorkspaceInviteBodySchema } from "@repo/validators";

import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import { WorkspaceRoleBadge } from "@/features/workspace/components/workspace-role-badge";
import {
  useCreateWorkspaceInvite,
  useRevokeWorkspaceInvite,
  useWorkspaceInvites,
} from "@/features/workspace/hooks/use-workspace-invites";
import type { WorkspaceRole } from "@/features/workspace/types";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

type WorkspaceInvitesPanelProps = {
  workspaceId: string;
  role: WorkspaceRole;
};

export function WorkspaceInvitesPanel({
  workspaceId,
  role,
}: WorkspaceInvitesPanelProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  const invitesQuery = useWorkspaceInvites(workspaceId);
  const createInvite = useCreateWorkspaceInvite(workspaceId);
  const revokeInvite = useRevokeWorkspaceInvite(workspaceId);

  if (!canManageWorkspace(role)) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Only workspace owners and admins can manage invites.
        </CardContent>
      </Card>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = createWorkspaceInviteBodySchema.safeParse({
      email,
      role: inviteRole,
    });

    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["email"]));
      return;
    }

    createInvite.mutate(parsed.data, {
      onSuccess: () => setEmail(""),
    });
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 shadow-sm">
        <Form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Invite people</CardTitle>
            <CardDescription>
              Send an invite by email. They can join with the code from their
              email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.email}>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {fieldErrors.email ? (
                  <FieldError>{fieldErrors.email}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <select
                  id="invite-role"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as "admin" | "member")
                  }
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              {createInvite.error ? (
                <FieldError>{createInvite.error.message}</FieldError>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={createInvite.isPending}>
              {createInvite.isPending ? "Sending..." : "Send invite"}
            </Button>
          </CardFooter>
        </Form>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Pending and past invites</CardTitle>
        </CardHeader>
        <CardContent>
          {invitesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading invites...</p>
          ) : null}
          {invitesQuery.error ? (
            <FieldError>{invitesQuery.error.message}</FieldError>
          ) : null}
          {(invitesQuery.data?.invites.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <div className="grid gap-3">
              {invitesQuery.data?.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <WorkspaceRoleBadge role={invite.role} />
                      <span className="text-xs capitalize text-muted-foreground">
                        {invite.status}
                      </span>
                    </div>
                  </div>
                  {invite.status === "pending" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revokeInvite.isPending}
                      onClick={() => revokeInvite.mutate(invite.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
