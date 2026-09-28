import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createAspectRatioSchema } from "@repo/validators/create";

export type StartGenerationToolResult = {
  generationId: string;
  status: string;
  message: string;
};

export type GetGenerationStatusToolResult = {
  generationId: string;
  status: string;
  outputAssetIds: string[];
  errorMessage: string | null;
};

export type CreateChatToolHandlers = {
  startGeneration: (input: {
    aspectRatio?: string;
  }) => Promise<StartGenerationToolResult>;
  getGenerationStatus: (input: {
    generationId: string;
  }) => Promise<GetGenerationStatusToolResult>;
};

export function createCreateChatTools(handlers: CreateChatToolHandlers) {
  const startGeneration = tool(
    async (input) => {
      const result = await handlers.startGeneration(input);
      return JSON.stringify(result);
    },
    {
      name: "start_generation",
      description:
        "Queue async image generation (Grok Imagine) for the user's current Create message. Call when they want an image produced and you have enough detail, or they explicitly ask to generate. Uses their message text and @ reference assets automatically.",
      schema: z.object({
        aspectRatio: createAspectRatioSchema
          .optional()
          .describe("Optional ratio such as 16:9"),
      }),
    },
  );

  const getGenerationStatus = tool(
    async (input) => {
      const result = await handlers.getGenerationStatus(input);
      return JSON.stringify(result);
    },
    {
      name: "get_generation_status",
      description:
        "Poll a generation job started with start_generation. Use when the user asks if an image is ready.",
      schema: z.object({
        generationId: z.uuid(),
      }),
    },
  );

  return [startGeneration, getGenerationStatus];
}
