import type { CreateChatModelId } from "@repo/validators";

export type CreateModelTier = "auto" | "cheap" | "default" | "premium";

export type { CreateChatModelId };

export type CreateGenerationUiStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type CreateMessageRole = "user" | "assistant";

export type CreateAttachedAsset = {
  id: string;
  name: string;
  s3Key: string;
  scope: "project" | "workspace";
};

export type CreateGenerationBlock = {
  id: string;
  status: CreateGenerationUiStatus;
  prompt: string;
  referenceNames: string[];
  errorMessage?: string | null;
  outputAssets?: Array<{
    id: string;
    name: string;
    s3Key: string;
    mimeType: string;
  }>;
};

export type CreateThreadMessage = {
  id: string;
  role: CreateMessageRole;
  content: string;
  createdAt: string;
  attachments?: CreateAttachedAsset[];
  generation?: CreateGenerationBlock;
};

export type CreateThread = {
  id: string;
  title: string;
  titleAuto: boolean;
  updatedAt: string;
  messages: CreateThreadMessage[];
};

export type CreateSessionState = {
  draft: string;
  chatModelId: CreateChatModelId;
  referenceAssetIds: string[];
};

export type CreateRecentItem = {
  id: string;
  title: string;
  updatedAt: string;
  status: CreateGenerationUiStatus;
};
