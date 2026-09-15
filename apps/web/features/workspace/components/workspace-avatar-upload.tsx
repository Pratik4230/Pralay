"use client";

import { useRef, useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";

import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { useUploadWorkspaceAvatar } from "@/features/workspace/hooks/use-workspace-avatar";

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
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const uploadAvatar = useUploadWorkspaceAvatar(workspaceId);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      uploadAvatar.reset();
      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    uploadAvatar.mutate(file, {
      onSuccess: () => {
        setLocalPreview(null);
      },
      onSettled: () => {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
    });
  }

  const previewKey = uploadAvatar.isSuccess
    ? uploadAvatar.data.workspace.avatarKey
    : avatarKey;

  return (
    <Field>
      <FieldLabel>Workspace avatar</FieldLabel>
      <div className="flex flex-wrap items-center gap-4">
        <WorkspaceAvatar
          name={name}
          avatarKey={localPreview ? null : previewKey}
          previewUrl={localPreview}
          className="size-16 text-base"
        />
        <div className="flex flex-col gap-2">
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
            {uploadAvatar.isPending ? "Uploading..." : "Upload avatar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP up to 5 MB.
          </p>
        </div>
      </div>
      {uploadAvatar.error ? (
        <FieldError>{uploadAvatar.error.message}</FieldError>
      ) : null}
    </Field>
  );
}
