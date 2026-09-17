import {
  defaultAssetFileName,
  validateWorkspaceAssetFile,
} from "@/features/workspace/utils/upload-workspace-asset";

export type PendingAssetUpload = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
};

export function createPendingAssetUploads(files: FileList | File[]) {
  const list = Array.from(files);
  const pending: PendingAssetUpload[] = [];
  const errors: string[] = [];

  for (const file of list) {
    const validationError = validateWorkspaceAssetFile(file);
    if (validationError) {
      errors.push(`${file.name}: ${validationError}`);
      continue;
    }

    pending.push({
      id: crypto.randomUUID(),
      file,
      name: defaultAssetFileName(file),
      previewUrl: URL.createObjectURL(file),
    });
  }

  return { pending, errors };
}

export function mergePendingAssetUploads(
  current: PendingAssetUpload[],
  files: FileList | File[],
) {
  const { pending: added, errors } = createPendingAssetUploads(files);
  return {
    pending: [...added, ...current],
    errors,
  };
}

export function revokePendingAssetUploads(pending: PendingAssetUpload[]) {
  for (const item of pending) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
