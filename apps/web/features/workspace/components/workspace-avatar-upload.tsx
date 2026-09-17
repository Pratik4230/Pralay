"use client";

import { useRef, useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { useUploadWorkspaceAvatar } from "@/features/workspace/hooks/use-workspace-avatar";
import {
  defaultAvatarFileName,
  validateWorkspaceAvatarFile,
} from "@/features/workspace/utils/upload-workspace-avatar";

type WorkspaceAvatarUploadProps = {
  workspaceId: string;
  name: string;
  avatarKey: string | null;
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export function WorkspaceAvatarUpload({
  workspaceId,
  name,
  avatarKey,
}: WorkspaceAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const uploadAvatar = useUploadWorkspaceAvatar(workspaceId);

  function clearSelection() {
    setSelectedFile(null);
    setImageName("");
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFieldError(null);
    uploadAvatar.reset();

    if (!file) {
      clearSelection();
      return;
    }

    const validationError = validateWorkspaceAvatarFile(file);
    if (validationError) {
      setFieldError(validationError);
      clearSelection();
      return;
    }

    setSelectedFile(file);
    setImageName(defaultAvatarFileName(file));
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(URL.createObjectURL(file));
  }

  function handleUpload() {
    if (!selectedFile) {
      setFieldError("Choose an image first");
      return;
    }

    if (!imageName.trim()) {
      setFieldError("Enter a name for this image");
      return;
    }

    uploadAvatar.mutate(
      { file: selectedFile, fileName: imageName.trim() },
      {
        onSuccess: () => {
          clearSelection();
        },
        onError: (error) => {
          setFieldError(
            error instanceof Error ? error.message : "Upload failed",
          );
        },
      },
    );
  }

  const previewKey = uploadAvatar.isSuccess
    ? uploadAvatar.data.workspace.avatarKey
    : avatarKey;

  return (
    <Field>
      <FieldLabel>Workspace avatar</FieldLabel>
      <div className="flex flex-wrap items-start gap-4">
        <WorkspaceAvatar
          name={name}
          avatarKey={localPreview ? null : previewKey}
          previewUrl={localPreview}
          className="size-16 text-base"
        />
        <div className="flex min-w-[12rem] flex-1 flex-col gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploadAvatar.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {selectedFile ? "Change image" : "Choose image"}
          </Button>
          {selectedFile ? (
            <Field>
              <FieldLabel htmlFor={`avatar-name-${workspaceId}`}>
                Image name
              </FieldLabel>
              <Input
                id={`avatar-name-${workspaceId}`}
                value={imageName}
                onChange={(event) => setImageName(event.target.value)}
                disabled={uploadAvatar.isPending}
                maxLength={80}
              />
              <FieldDescription>
                Used in storage for this file (e.g. logo, team-photo).
              </FieldDescription>
            </Field>
          ) : null}
          {selectedFile ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={uploadAvatar.isPending}
                onClick={handleUpload}
              >
                {uploadAvatar.isPending ? "Uploading..." : "Upload avatar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={uploadAvatar.isPending}
                onClick={clearSelection}
              >
                Cancel
              </Button>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP up to 5 MB.
          </p>
        </div>
      </div>
      {fieldError ? <FieldError>{fieldError}</FieldError> : null}
    </Field>
  );
}
