"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Form,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { updateWorkspaceBodySchema } from "@repo/validators";
import type { UpdateWorkspaceBody } from "@repo/validators";

import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import { WorkspaceAvatarUpload } from "@/features/workspace/components/workspace-avatar-upload";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
} from "@/features/workspace/hooks/use-workspaces";
import type { WorkspaceRole } from "@/features/workspace/types";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";
import { ApiRequestError } from "@/global/utils/api-client";

type WorkspaceSettingsPanelProps = {
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  avatarKey: string | null;
  role: WorkspaceRole;
  onDeleted: () => void;
};

export function WorkspaceSettingsPanel({
  workspaceId,
  name,
  slug,
  description,
  avatarKey,
  role,
  onDeleted,
}: WorkspaceSettingsPanelProps) {
  const [workspaceName, setWorkspaceName] = useState(name);
  const [workspaceSlug, setWorkspaceSlug] = useState(slug);
  const [workspaceDescription, setWorkspaceDescription] = useState(
    description ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    slug?: string;
    description?: string;
  }>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const deleteWorkspace = useDeleteWorkspace();

  useEffect(() => {
    setWorkspaceName(name);
    setWorkspaceSlug(slug);
    setWorkspaceDescription(description ?? "");
  }, [name, slug, description]);

  if (!canManageWorkspace(role)) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Only workspace owners and admins can change settings.
        </CardContent>
      </Card>
    );
  }

  function handleSlugChange(value: string) {
    setWorkspaceSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    if (fieldErrors.slug) {
      setFieldErrors((current) => ({ ...current, slug: undefined }));
    }
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setSaveMessage(null);

    const updates: UpdateWorkspaceBody = {};
    const trimmedName = workspaceName.trim();
    const trimmedSlug = workspaceSlug.trim();
    const nextDescription = workspaceDescription.trim()
      ? workspaceDescription.trim()
      : null;

    if (trimmedName !== name) {
      updates.name = trimmedName;
    }
    if (trimmedSlug !== slug) {
      updates.slug = trimmedSlug;
    }
    if (nextDescription !== (description ?? null)) {
      updates.description = nextDescription;
    }

    if (
      updates.name === undefined &&
      updates.slug === undefined &&
      updates.description === undefined
    ) {
      setSaveMessage("No changes to save.");
      return;
    }

    const parsed = updateWorkspaceBodySchema.safeParse(updates);
    if (!parsed.success) {
      setFieldErrors(
        parseFieldErrors(parsed.error, ["name", "slug", "description"]),
      );
      return;
    }

    updateWorkspace.mutate(parsed.data, {
      onSuccess: () => {
        setSaveMessage("Workspace updated.");
      },
      onError: (error) => {
        if (error instanceof ApiRequestError && error.status === 409) {
          setFieldErrors({
            slug: error.message ?? "This slug is already taken",
          });
        }
      },
    });
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 shadow-sm">
        <Form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Workspace settings</CardTitle>
            <CardDescription>
              Update your workspace name, URL slug, and description. Change
              the avatar separately below.
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
                  disabled={updateWorkspace.isPending}
                  maxLength={80}
                />
                {fieldErrors.name ? (
                  <FieldError>{fieldErrors.name}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={!!fieldErrors.slug}>
                <FieldLabel htmlFor="settings-slug">Slug</FieldLabel>
                <Input
                  id="settings-slug"
                  value={workspaceSlug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  disabled={updateWorkspace.isPending}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={42}
                />
                <FieldDescription>
                  Used in URLs. Lowercase letters, numbers, and hyphens only
                  (max 42).
                </FieldDescription>
                {fieldErrors.slug ? (
                  <FieldError>{fieldErrors.slug}</FieldError>
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
                  disabled={updateWorkspace.isPending}
                  rows={3}
                  maxLength={500}
                />
                <FieldDescription>
                  Optional. {workspaceDescription.length}/500 characters.
                </FieldDescription>
                {fieldErrors.description ? (
                  <FieldError>{fieldErrors.description}</FieldError>
                ) : null}
              </Field>
              {saveMessage ? (
                <p className="text-sm text-muted-foreground">{saveMessage}</p>
              ) : null}
              {updateWorkspace.error &&
              !(updateWorkspace.error instanceof ApiRequestError &&
                updateWorkspace.error.status === 409) ? (
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
        <>
          <ConfirmAlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete workspace?"
            description="This permanently deletes the workspace and all related data. Members will lose access. This cannot be undone."
            confirmLabel="Delete workspace"
            isLoading={deleteWorkspace.isPending}
            onConfirm={async () => {
              try {
                await deleteWorkspace.mutateAsync(workspaceId);
                setDeleteDialogOpen(false);
                toast.success("Workspace deleted");
                onDeleted();
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not delete workspace",
                );
              }
            }}
          />
          <Card className="border-destructive/30 shadow-sm">
            <CardHeader>
              <CardTitle>Delete workspace</CardTitle>
              <CardDescription>
                Permanently delete this workspace and all related data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deleteWorkspace.error ? (
                <FieldError>{deleteWorkspace.error.message}</FieldError>
              ) : null}
            </CardContent>
            <CardFooter className="gap-3 border-t-0 bg-transparent">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete workspace
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : null}
    </div>
  );
}
