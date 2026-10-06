import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createAspectRatioSchema } from "@repo/validators/create";

export type StartGenerationToolResult = {
  generationId: string;
  status: string;
  message: string;
};

export type CreateGenerationMode = "generate" | "edit" | "variation";

export type CreateGenerationReference = {
  assetId: string;
  role: string;
};

export type GetGenerationStatusToolResult = {
  generationId: string;
  status: string;
  outputAssetIds: string[];
  errorMessage: string | null;
};

export type SearchAssetsToolResult = {
  query: string;
  items: Array<{
    id: string;
    name: string;
    scope: string;
    score: number;
    confidence: "high" | "medium" | "low";
    matchedOn: string;
  }>;
  /** Plain-language hint when uploads are needed (no URLs). */
  uploadHint: string;
};

export type InspectAssetsToolResult = {
  assets: Array<{
    id: string;
    name: string;
    category:
      "person" | "logo" | "product" | "background" | "reference" | "other";
    tags: string[];
    mimeType: string;
    width: number | null;
    height: number | null;
    scope: "workspace" | "project";
    description: string | null;
  }>;
  message: string;
};

export type WebSearchToolResult = {
  summary: string;
};

export type CreateChatToolHandlers = {
  searchAssets: (input: {
    query: string;
    limit?: number;
  }) => Promise<SearchAssetsToolResult>;
  inspectAssets: (input: {
    assetIds: string[];
  }) => Promise<InspectAssetsToolResult>;
  webSearch: (input: { query: string }) => Promise<WebSearchToolResult>;
  startGeneration: (input: {
    mode: CreateGenerationMode;
    aspectRatio?: string;
    prompt?: string;
    references?: CreateGenerationReference[];
  }) => Promise<StartGenerationToolResult>;
  getGenerationStatus: (input: {
    generationId: string;
  }) => Promise<GetGenerationStatusToolResult>;
};

export function createCreateChatTools(handlers: CreateChatToolHandlers) {
  const searchAssets = tool(
    async (input) => {
      const result = await handlers.searchAssets(input);
      return JSON.stringify(result);
    },
    {
      name: "search_assets",
      description:
        "Search the workspace and project library for upload assets by name or tag. Use for each entity in the user prompt before generating.",
      schema: z.object({
        query: z.string().trim().min(1).max(80),
        limit: z.number().int().min(1).max(12).optional(),
      }),
    },
  );

  const inspectAssets = tool(
    async (input) => {
      const result = await handlers.inspectAssets(input);
      return JSON.stringify(result);
    },
    {
      name: "inspect_assets",
      description:
        "Load safe metadata for library assets. Use this to understand their names, categories, tags, and dimensions. This tool never returns image bytes or URLs.",
      schema: z.object({
        assetIds: z.array(z.uuid()).min(1).max(4),
      }),
    },
  );

  const webSearch = tool(
    async (input) => {
      const result = await handlers.webSearch(input);
      return JSON.stringify(result);
    },
    {
      name: "web_search",
      description:
        "Search the public web for non-identity context only. Do not use to identify private people or workspace-specific names.",
      schema: z.object({
        query: z.string().trim().min(1).max(500),
      }),
    },
  );

  const startGeneration = tool(
    async (input) => {
      const result = await handlers.startGeneration(input);
      return JSON.stringify(result);
    },
    {
      name: "start_generation",
      description:
        "Queue a new image, edit, or variation. Choose the exact ordered set of at most five authorized reference candidates. For a variation, put the generated base image first.",
      schema: z.object({
        mode: z.enum(["generate", "edit", "variation"]),
        aspectRatio: createAspectRatioSchema
          .optional()
          .describe("Optional ratio such as 16:9"),
        prompt: z
          .string()
          .trim()
          .min(1)
          .max(8000)
          .optional()
          .describe(
            "Detailed generation prompt. Reference linked images as <IMAGE_0>, <IMAGE_1> in order.",
          ),
        references: z
          .array(
            z.object({
              assetId: z.uuid(),
              role: z.string().trim().min(1).max(200),
            }),
          )
          .max(5)
          .optional()
          .describe(
            "Exact ordered references. Image order is significant. Include each asset once with its role.",
          ),
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

  return [
    searchAssets,
    inspectAssets,
    webSearch,
    startGeneration,
    getGenerationStatus,
  ];
}
