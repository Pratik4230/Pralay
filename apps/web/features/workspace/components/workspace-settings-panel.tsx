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
import { Textarea } from "@repo/ui/components/textarea";
import { updateWorkspaceBodySchema } from "@repo/validators";

import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import { WorkspaceAvatarUpload } from "@/features/workspace/components/workspace-avatar-upload";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
} from "@/features/workspace/hooks/use-workspaces";
import type { WorkspaceRole } from "@/features/workspace/types";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

type WorkspaceSettingsPanelProps = {
  workspaceId: string;
  name: string;
  description: string | null;
  avatarKey: string | null;
  role: WorkspaceRole;
  onDeleted: () => void;
};

export function WorkspaceSettingsPanel({
  workspaceId,
  name,
  description,
  avatarKey,
  role,
  onDeleted,
}: WorkspaceSettingsPanelProps) {
  const [workspaceName, setWorkspaceName] = useState(name);
  const [workspaceDescription, setWorkspaceDescription] = useState(
    description ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const deleteWorkspace = useDeleteWorkspace();

  if (!canManageWorkspace(role)) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Only workspace owners and admins can change settings.
        </CardContent>
      </Card>
    );
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = updateWorkspaceBodySchema.safeParse({
      name: workspaceName,
      description: workspaceDescription.trim() ? workspaceDescription : null,
    });

    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["name", "description"]));
      return;
    }

    updateWorkspace.mutate(parsed.data);
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 shadow-sm">
        <Form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Workspace settings</CardTitle>
            <CardDescription>
              Update your workspace name and description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <WorkspaceAvatarUpload
                workspaceId={workspaceId}
                name={workspaceName}
                avatarKey={avatarKey}
              />
              <Field data-invalid={!!fieldErrors.name}>
                <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                <Input
                  id="settings-name"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
                {fieldErrors.name ? (
                  <FieldError>{fieldErrors.name}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={!!fieldErrors.description}>
                <FieldLabel htmlFor="settings-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="settings-description"
                  placeholder="Describe this workspace"
                  value={workspaceDescription}
                  onChange={(event) =>
                    setWorkspaceDescription(event.target.value)
                  }
                />
                {fieldErrors.description ? (
                  <FieldError>{fieldErrors.description}</FieldError>
                ) : null}
              </Field>
              {updateWorkspace.error ? (
                <FieldError>{updateWorkspace.error.message}</FieldError>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Form>
      </Card>

      {role === "owner" ? (
        <Card className="border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle>Delete workspace</CardTitle>
            <CardDescription>
              Permanently delete this workspace and all related data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confirmDelete ? (
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All members will lose access.
              </p>
            ) : null}
            {deleteWorkspace.error ? (
              <FieldError>{deleteWorkspace.error.message}</FieldError>
            ) : null}
          </CardContent>
          <CardFooter className="gap-3 border-t-0 bg-transparent">
            {confirmDelete ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteWorkspace.isPending}
                  onClick={() =>
                    deleteWorkspace.mutate(workspaceId, {
                      onSuccess: onDeleted,
                    })
                  }
                >
                  {deleteWorkspace.isPending
                    ? "Deleting..."
                    : "Confirm delete"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete workspace
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
