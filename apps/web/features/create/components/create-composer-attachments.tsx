"use client";

import { useEffect, useState, type FC } from "react";
import { useAuiState } from "@assistant-ui/react";

import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { ComposerAttachments } from "@/global/components/assistant-ui/elements/attachment.aui";
import { Input } from "@repo/ui/components/input";
import {
  parseWorkspaceAssetDisplayName,
  WORKSPACE_ASSET_NAME_INVALID_MESSAGE,
} from "@repo/validators/asset";
import { cn } from "@repo/ui/lib/utils";

type CreateComposerAttachmentNamesProps = {
  projectId: string;
};

/** Name field only for new + uploads, not @ library picks (already named). */
function isPendingComposerUpload(attachment: {
  file?: File | null;
  status: { type: string; reason?: string };
}): boolean {
  if (attachment.file instanceof File) {
    return true;
  }
  return (
    attachment.status.type === "requires-action" &&
    attachment.status.reason === "composer-send"
  );
}

const CreateComposerAttachmentNameField: FC<{
  projectId: string;
  attachmentId: string;
}> = ({ projectId, attachmentId }) => {
  const setComposerUploadName = useCreateProjectStore(
    (state) => state.setComposerUploadName,
  );
  const stored = useCreateProjectStore(
    (state) => state.byProject[projectId]?.composerUploadNames[attachmentId],
  );

  const [value, setValue] = useState(stored ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stored !== undefined) {
      setValue(stored);
    }
  }, [stored]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    try {
      const normalized = parseWorkspaceAssetDisplayName(trimmed);
      setValue(normalized);
      setError(null);
      setComposerUploadName(projectId, attachmentId, normalized);
    } catch {
      setError(WORKSPACE_ASSET_NAME_INVALID_MESSAGE);
    }
  };

  return (
    <div className="flex min-w-35 max-w-50 flex-col gap-0.5">
      <Input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        onBlur={() => commit(value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(value);
            event.currentTarget.blur();
          }
        }}
        aria-label="Image name for upload"
        placeholder="Enter image name"
        className={cn(
          "h-8 text-xs",
          error && "border-destructive focus-visible:ring-destructive/30",
        )}
      />
      <p className="text-muted-foreground text-[10px] leading-tight">
        {error ??
          "Lowercase letters, numbers, underscores. Spaces become underscores on save."}
      </p>
    </div>
  );
};

/** Composer attachments with editable library names before upload/send. */
export const CreateComposerAttachments: FC<
  CreateComposerAttachmentNamesProps
> = ({ projectId }) => {
  const attachments = useAuiState((state) => state.composer.attachments);
  const uploadAttachments = attachments.filter(isPendingComposerUpload);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <ComposerAttachments />
      {uploadAttachments.length > 0 ? (
        <div className="flex flex-wrap gap-3 px-0.5">
          {uploadAttachments.map((attachment) => (
            <CreateComposerAttachmentNameField
              key={attachment.id}
              projectId={projectId}
              attachmentId={attachment.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
