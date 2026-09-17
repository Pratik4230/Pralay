"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
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
import { createWorkspaceBodySchema } from "@repo/validators";

import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { useCreateWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { defaultAvatarFileName, validateWorkspaceAvatarFile } from "@/features/workspace/utils/upload-workspace-avatar";
import { ApiRequestError } from "@/global/utils/api-client";

const acceptedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];

type CreateWorkspaceField =
  | "name"
  | "slug"
  | "description"
  | "avatar"
  | "avatarName";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarImageName, setAvatarImageName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CreateWorkspaceField, string>>
  >({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const createWorkspace = useCreateWorkspace();

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setAvatarFile(null);
    setAvatarImageName("");
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setFieldErrors({});
    setFormMessage(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    if (fieldErrors.slug) {
      setFieldErrors((current) => ({ ...current, slug: undefined }));
    }
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFieldErrors((current) => ({ ...current, avatar: undefined }));

    if (!file) {
      setAvatarFile(null);
      setAvatarImageName("");
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      return;
    }

    const validationError = validateWorkspaceAvatarFile(file);
    if (validationError) {
      setFieldErrors((current) => ({ ...current, avatar: validationError }));
      setAvatarFile(null);
      setAvatarImageName("");
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarImageName(defaultAvatarFileName(file));
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormMessage(null);

    const parsed = createWorkspaceBodySchema.safeParse({
      name,
      description: description.trim() || undefined,
      slug: slug.trim() || undefined,
    });

    if (!parsed.success) {
      setFieldErrors(
        parseFieldErrors(parsed.error, ["name", "slug", "description"]),
      );
      return;
    }

    if (avatarFile && !avatarImageName.trim()) {
      setFieldErrors({ avatarName: "Enter a name for this image" });
      return;
    }

    createWorkspace.mutate(
      {
        ...parsed.data,
        avatarFile,
        avatarFileName: avatarFile ? avatarImageName.trim() : undefined,
      },
      {
        onSuccess: ({ data }) => {
          handleOpenChange(false);
          router.push(`/dashboard/workspaces/${data.workspace.id}`);
        },
        onError: (error) => {
          if (error instanceof ApiRequestError && error.status === 409) {
            setFieldErrors({
              slug: error.message ?? "This slug is already taken",
            });
            return;
          }

          setFormMessage(
            error instanceof Error
              ? error.message
              : "Unable to create workspace",
          );
        },
      },
    );
  }

  const isPending = createWorkspace.isPending;
  const pendingLabel = isPending
    ? avatarFile
      ? "Creating & uploading…"
      : "Creating workspace…"
    : "Create workspace";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Set up a workspace for your team or personal projects.
          </DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.name}>
              <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
              <Input
                id="workspace-name"
                placeholder="Acme Studio"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={!!fieldErrors.name}
                disabled={isPending}
              />
              {fieldErrors.name ? (
                <FieldError>{fieldErrors.name}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!fieldErrors.slug}>
              <FieldLabel htmlFor="workspace-slug">Slug</FieldLabel>
              <Input
                id="workspace-slug"
                placeholder="acme-studio"
                value={slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                aria-invalid={!!fieldErrors.slug}
                disabled={isPending}
                autoComplete="off"
                spellCheck={false}
                maxLength={42}
              />
              <FieldDescription>
                Used in URLs. Lowercase letters, numbers, and hyphens only (max
                42). Leave blank to generate from the name.
              </FieldDescription>
              {fieldErrors.slug ? (
                <FieldError>{fieldErrors.slug}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!fieldErrors.description}>
              <FieldLabel htmlFor="workspace-description">Description</FieldLabel>
              <Textarea
                id="workspace-description"
                placeholder="What is this workspace for?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={!!fieldErrors.description}
                disabled={isPending}
                rows={3}
                maxLength={500}
              />
              <FieldDescription>
                Optional. {description.length}/500 characters.
              </FieldDescription>
              {fieldErrors.description ? (
                <FieldError>{fieldErrors.description}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!fieldErrors.avatar}>
              <FieldLabel>Avatar</FieldLabel>
              <div className="flex flex-wrap items-center gap-4">
                <WorkspaceAvatar
                  name={name.trim() || "Workspace"}
                  previewUrl={avatarPreview}
                  className="size-14 text-base"
                />
                <div className="flex flex-col gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={acceptedAvatarTypes.join(",")}
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarFile ? "Change image" : "Choose image"}
                  </Button>
                  {avatarFile ? (
                    <>
                      <Field className="mt-2">
                        <FieldLabel htmlFor="workspace-avatar-name">
                          Image name
                        </FieldLabel>
                        <Input
                          id="workspace-avatar-name"
                          value={avatarImageName}
                          onChange={(event) =>
                            setAvatarImageName(event.target.value)
                          }
                          disabled={isPending}
                          maxLength={80}
                        />
                        <FieldDescription>
                          Used in storage for this file (e.g. logo, team-photo).
                        </FieldDescription>
                        {fieldErrors.avatarName ? (
                          <FieldError>{fieldErrors.avatarName}</FieldError>
                        ) : null}
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto px-0 text-muted-foreground"
                        disabled={isPending}
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarImageName("");
                          if (avatarPreview) {
                            URL.revokeObjectURL(avatarPreview);
                          }
                          setAvatarPreview(null);
                          if (avatarInputRef.current) {
                            avatarInputRef.current.value = "";
                          }
                        }}
                      >
                        Remove image
                      </Button>
                    </>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Optional. JPG, PNG, or WebP up to 5 MB.
                  </p>
                </div>
              </div>
              {fieldErrors.avatar ? (
                <FieldError>{fieldErrors.avatar}</FieldError>
              ) : null}
            </Field>

            {formMessage ? (
              <p className="text-sm text-destructive">{formMessage}</p>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {pendingLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
