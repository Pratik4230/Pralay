import type { CreateChatToolHandlers } from "@repo/agents";
import type { SendProjectAssistantMessageBody } from "@repo/validators";

import {
  attachGenerationToAssistantUserMessage,
  GenerationNotFoundError,
  getProjectGeneration,
  StorageNotConfiguredError,
} from "../../generations/services/project-generations.service.js";
import type { MessageRow } from "./project-assistant.service.js";
import { mapMessage } from "./project-assistant.service.js";

export function createCreateChatToolHandlers(input: {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  body: SendProjectAssistantMessageBody;
  getUserMessageRow: () => MessageRow;
  setUserMessageRow: (row: MessageRow) => void;
  onGenerationLinked?: (userMessage: ReturnType<typeof mapMessage>) => void;
}): CreateChatToolHandlers {
  return {
    startGeneration: async ({ aspectRatio }) => {
      const current = input.getUserMessageRow();
      if (current.generationId) {
        return {
          generationId: current.generationId,
          status: "queued",
          message: "Generation already queued for this message.",
        };
      }

      try {
        const linked = await attachGenerationToAssistantUserMessage({
          actorUserId: input.actorUserId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          messageId: current.id,
          prompt: input.body.prompt,
          inputAssetIds: input.body.referenceAssetIds,
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
