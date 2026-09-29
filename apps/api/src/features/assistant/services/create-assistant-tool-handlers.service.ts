import { runOpenAiWebSearch, type CreateChatToolHandlers } from "@repo/agents";
import type { SendProjectAssistantMessageBody } from "@repo/validators";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assets, assistantMessages } from "@repo/db/schema";
import { createPresignedDownloadUrl } from "@repo/storage";

import { searchWorkspaceAssetsForCreateAgent } from "../../assets/services/create-asset-search.service.js";
import {
  attachGenerationToAssistantUserMessage,
  GenerationNotFoundError,
  getProjectGeneration,
  InvalidGenerationInputAssetsError,
  StorageNotConfiguredError,
} from "../../generations/services/project-generations.service.js";
import type { MessageRow } from "./project-assistant.service.js";
import { mapMessage } from "./project-assistant.service.js";

const CREATE_UPLOAD_HINT =
  "Use the + attach button in the composer to upload a reference image and set its name (example: jonathan), or type @ to pick from the library.";

async function assertAssetsForProject(
  workspaceId: string,
  projectId: string,
  assetIds: string[],
) {
  if (assetIds.length === 0) return;

  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        inArray(assets.id, assetIds),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
        or(
          isNull(assets.primaryProjectId),
          eq(assets.primaryProjectId, projectId),
        ),
      ),
    );

  if (rows.length !== assetIds.length) {
    throw new InvalidGenerationInputAssetsError();
  }
}

async function loadAssetPreviews(
  workspaceId: string,
  projectId: string,
  assetIds: string[],
) {
  await assertAssetsForProject(workspaceId, projectId, assetIds);

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      mimeType: assets.mimeType,
      s3Key: assets.s3Key,
    })
    .from(assets)
    .where(inArray(assets.id, assetIds));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const previews: Array<{
    id: string;
    name: string;
    previewUrl: string;
    mimeType: string;
  }> = [];

  for (const id of assetIds) {
    const row = byId.get(id);
    if (!row) continue;
    if (!row.mimeType.startsWith("image/")) {
      continue;
    }
    const previewUrl = await createPresignedDownloadUrl({
      key: row.s3Key,
      expiresIn: 3600,
    });
    previews.push({
      id: row.id,
      name: row.name,
      previewUrl,
      mimeType: row.mimeType,
    });
  }

  return previews;
}

export function createCreateChatToolHandlers(input: {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  body: SendProjectAssistantMessageBody;
  getUserMessageRow: () => MessageRow;
  setUserMessageRow: (row: MessageRow) => void;
  onGenerationLinked?: (userMessage: ReturnType<typeof mapMessage>) => void;
  pendingVisionPreviews: Array<{ name: string; url: string }>;
}): CreateChatToolHandlers {
  const mergeReferenceAssetIds = (extra: string[]) => {
    const merged = [
      ...new Set([...input.body.referenceAssetIds, ...extra]),
    ].slice(0, 12);
    return merged;
  };

  const persistReferenceAssetIds = async (assetIds: string[]) => {
    const merged = mergeReferenceAssetIds(assetIds);
    await assertAssetsForProject(
      input.workspaceId,
      input.projectId,
      merged,
    );

    const current = input.getUserMessageRow();
    const [updated] = await db
      .update(assistantMessages)
      .set({ referenceAssetIds: merged })
      .where(
        and(
          eq(assistantMessages.id, current.id),
          eq(assistantMessages.role, "user"),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to update message references");
    }

    input.setUserMessageRow(updated);
    return { row: updated, merged };
  };

  return {
    searchAssets: async ({ query, limit }) => {
      const result = await searchWorkspaceAssetsForCreateAgent(
        input.actorUserId,
        input.workspaceId,
        input.projectId,
        query,
        limit ?? 8,
      );

      return {
        query: result.query,
        uploadHint: CREATE_UPLOAD_HINT,
        items: result.items.map((item) => ({
          id: item.id,
          name: item.name,
          scope: item.scope,
          score: item.score,
          confidence: item.confidence,
          matchedOn: item.matchedOn,
        })),
      };
    },

    inspectAssets: async ({ assetIds }) => {
      const previews = await loadAssetPreviews(
        input.workspaceId,
        input.projectId,
        assetIds.slice(0, 4),
      );

      for (const preview of previews) {
        input.pendingVisionPreviews.push({
          name: preview.name,
          url: preview.previewUrl,
        });
      }

      return {
        assets: previews,
        message:
          previews.length > 0
            ? "Preview URLs attached for vision on the next model turn."
            : "No image previews available for those asset IDs.",
      };
    },

    linkReferenceAssets: async ({ assetIds }) => {
      const { merged } = await persistReferenceAssetIds(assetIds);
      const rows = await db
        .select({ id: assets.id, name: assets.name })
        .from(assets)
        .where(inArray(assets.id, merged));

      const linkedNames = rows.map((row) => `@${row.name}`);

      return {
        referenceAssetIds: merged,
        linkedNames,
        message:
          linkedNames.length > 0
            ? `Linked ${linkedNames.join(", ")} to this message.`
            : "References linked.",
      };
    },

    webSearch: async ({ query }) => {
      try {
        const summary = await runOpenAiWebSearch(query);
        return { summary };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Web search failed";
        return { summary: message };
      }
    },

    startGeneration: async ({ aspectRatio, prompt, referenceAssetIds }) => {
      const current = input.getUserMessageRow();
      if (current.generationId) {
        return {
          generationId: current.generationId,
          status: "queued",
          message: "Generation already queued for this message.",
        };
      }

      let mergedRefs = current.referenceAssetIds;
      if (referenceAssetIds && referenceAssetIds.length > 0) {
        const persisted = await persistReferenceAssetIds(referenceAssetIds);
        mergedRefs = persisted.merged;
      }

      const generationPrompt = prompt?.trim() || input.body.prompt;

      try {
        const linked = await attachGenerationToAssistantUserMessage({
          actorUserId: input.actorUserId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          messageId: current.id,
          prompt: generationPrompt,
          inputAssetIds: mergedRefs,
          aspectRatio: aspectRatio ?? input.body.aspectRatio,
        });

        input.setUserMessageRow(linked.userMessageRow);
        const mapped = mapMessage(linked.userMessageRow);
        input.onGenerationLinked?.(mapped);

        return {
          generationId: linked.generationRow.id,
          status: linked.generationRow.status,
          message: "Generation queued.",
        };
      } catch (error) {
        if (error instanceof StorageNotConfiguredError) {
          return {
            generationId: "",
            status: "failed",
            message: "Image storage is not configured on this server.",
          };
        }
        if (error instanceof InvalidGenerationInputAssetsError) {
          return {
            generationId: "",
            status: "failed",
            message:
              "One or more reference assets are invalid. Search the library, use @, or upload with the + attach button.",
          };
        }
        throw error;
      }
    },

    getGenerationStatus: async ({ generationId }) => {
      try {
        const generation = await getProjectGeneration(
          input.actorUserId,
          input.workspaceId,
          input.projectId,
          generationId,
        );

        return {
          generationId: generation.id,
          status: generation.status,
          outputAssetIds: generation.outputAssetIds,
          errorMessage: generation.errorMessage,
        };
      } catch (error) {
        if (error instanceof GenerationNotFoundError) {
          return {
            generationId,
            status: "failed",
            outputAssetIds: [],
            errorMessage: "Generation not found.",
          };
        }
        throw error;
      }
    },
  };
}
