import type { QueryClient } from "@tanstack/react-query";

import type { AssistantMessage } from "@repo/validators";

import type {
  CreateAttachedAsset,
  CreateThreadMessage,
} from "@/features/create/types/create-ui";
import { findCachedWorkspaceAsset } from "@/features/create/utils/find-cached-workspace-asset";

function mapReferenceAssets(
  queryClient: QueryClient,
  workspaceId: string,
  referenceAssetIds: string[],
  fallbackById?: Map<string, CreateAttachedAsset>,
): CreateAttachedAsset[] | undefined {
  if (referenceAssetIds.length === 0) return undefined;

  const attachments: CreateAttachedAsset[] = [];

  for (const assetId of referenceAssetIds) {
    const fallback = fallbackById?.get(assetId);
    if (fallback) {
      attachments.push(fallback);
      continue;
    }

    const cached = findCachedWorkspaceAsset(queryClient, workspaceId, assetId);
    if (!cached) continue;

    attachments.push({
      id: cached.id,
      name: cached.name,
      s3Key: cached.s3Key,
      scope: cached.primaryProjectId ? "project" : "workspace",
    });
  }

  return attachments.length > 0 ? attachments : undefined;
}

export function mapAssistantMessageToCreateMessage(
  queryClient: QueryClient,
  workspaceId: string,
  message: AssistantMessage,
  fallbackById?: Map<string, CreateAttachedAsset>,
): CreateThreadMessage | null {
  if (message.role === "system") return null;

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    attachments:
      message.role === "user"
        ? mapReferenceAssets(
            queryClient,
            workspaceId,
            message.referenceAssetIds,
            fallbackById,
          )
        : undefined,
  };
}

export function mapAssistantMessagesToCreateMessages(
  queryClient: QueryClient,
  workspaceId: string,
  messages: AssistantMessage[],
  fallbackById?: Map<string, CreateAttachedAsset>,
): CreateThreadMessage[] {
  return messages
    .map((message) =>
      mapAssistantMessageToCreateMessage(
        queryClient,
        workspaceId,
        message,
        fallbackById,
      ),
    )
    .filter((message): message is CreateThreadMessage => message !== null);
}
