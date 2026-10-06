import {
  runOpenAiWebSearch,
  type CreateChatReferenceCandidate,
  type CreateChatToolHandlers,
  type InspectAssetsToolResult,
} from "@repo/agents";
import type { SendProjectAssistantMessageBody } from "@repo/validators";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@repo/db";
import { assets, assistantMessages } from "@repo/db/schema";

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
import { validateCreateGenerationReferenceSelection } from "./create-generation-reference-selection.js";

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

export async function loadCreateAssetMetadata(
  workspaceId: string,
  projectId: string,
  assetIds: string[],
): Promise<InspectAssetsToolResult["assets"]> {
  await assertAssetsForProject(workspaceId, projectId, assetIds);

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      category: assets.category,
      tags: assets.tags,
      mimeType: assets.mimeType,
      width: assets.width,
      height: assets.height,
      primaryProjectId: assets.primaryProjectId,
      description: assets.description,
    })
    .from(assets)
    .where(inArray(assets.id, assetIds));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const previews: InspectAssetsToolResult["assets"] = [];

  for (const id of assetIds) {
    const row = byId.get(id);
    if (!row) continue;
    previews.push({
      id: row.id,
      name: row.name,
      category: row.category,
      tags: row.tags,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      scope: row.primaryProjectId ? "project" : "workspace",
      description: row.description,
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
  referenceCandidates: CreateChatReferenceCandidate[];
}): CreateChatToolHandlers {
  const candidateById = new Map(
    input.referenceCandidates.map((candidate) => [candidate.id, candidate]),
  );
  const authorizedCandidateIds = new Set(candidateById.keys());

  const persistSelectedReferenceAssetIds = async (assetIds: string[]) => {
    if (assetIds.length > 5 || new Set(assetIds).size !== assetIds.length) {
      throw new InvalidGenerationInputAssetsError();
    }
    if (assetIds.some((assetId) => !authorizedCandidateIds.has(assetId))) {
      throw new InvalidGenerationInputAssetsError();
    }
    await assertAssetsForProject(input.workspaceId, input.projectId, assetIds);

    const current = input.getUserMessageRow();
    const [updated] = await db
      .update(assistantMessages)
      .set({ referenceAssetIds: assetIds })
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
    return updated;
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
      for (const item of result.items) {
        if (item.confidence === "high") {
          authorizedCandidateIds.add(item.id);
        }
      }

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
      const previews = await loadCreateAssetMetadata(
        input.workspaceId,
        input.projectId,
        assetIds.slice(0, 4),
      );

      return {
        assets: previews,
        message:
          previews.length > 0
            ? "Asset metadata loaded. No image pixels were sent."
            : "No matching assets were found.",
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

    startGeneration: async ({ mode, aspectRatio, prompt, references }) => {
      const current = input.getUserMessageRow();
      if (current.generationId) {
        return {
          generationId: current.generationId,
          status: "queued",
          message: "Generation already queued for this message.",
        };
      }

      const selectedReferences = references ?? [];
      const selection = validateCreateGenerationReferenceSelection({
        mode,
        references: selectedReferences,
        authorizedCandidateIds,
        authorizedCandidates: candidateById,
      });
      if (!selection.ok) {
        return {
          generationId: "",
          status: "failed",
          message: selection.message,
        };
      }
      const selectedIds = selection.assetIds;

      const referenceRoles = Object.fromEntries(
        selectedReferences.map((reference) => [
          reference.assetId,
          reference.role,
        ]),
      );

      const generationPrompt = prompt?.trim() || input.body.prompt;

      try {
        await persistSelectedReferenceAssetIds(selectedIds);
        const linked = await attachGenerationToAssistantUserMessage({
          actorUserId: input.actorUserId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          messageId: current.id,
          prompt: generationPrompt,
          inputAssetIds: selectedIds,
          aspectRatio: aspectRatio ?? input.body.aspectRatio,
          referenceRoles,
          type: mode,
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
