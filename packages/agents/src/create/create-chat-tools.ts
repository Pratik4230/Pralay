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
    previewUrl: string;
    mimeType: string;
  }>;
  message: string;
};

export type LinkReferenceAssetsToolResult = {
  referenceAssetIds: string[];
  linkedNames: string[];
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
  linkReferenceAssets: (input: {
    assetIds: string[];
  }) => Promise<LinkReferenceAssetsToolResult>;
  webSearch: (input: { query: string }) => Promise<WebSearchToolResult>;
  startGeneration: (input: {
    aspectRatio?: string;
    prompt?: string;
    referenceAssetIds?: string[];
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
        "Load presigned preview URLs for library assets so you can see faces and logos. Call before start_generation for assets you will reference.",
      schema: z.object({
        assetIds: z.array(z.uuid()).min(1).max(4),
      }),
    },
  );

  const linkReferenceAssets = tool(
    async (input) => {
      const result = await handlers.linkReferenceAssets(input);
      return JSON.stringify(result);
    },
    {
      name: "link_reference_assets",
      description:
        "Attach resolved library asset IDs to the current user message. Call after high-confidence matches or user confirmation.",
      schema: z.object({
        assetIds: z.array(z.uuid()).min(1).max(12),
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
        "Queue async image generation (Grok Imagine) for the current Create message. Requires library resolution when the prompt names specific people or brands.",
      schema: z.object({
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
        referenceAssetIds: z
          .array(z.uuid())
          .max(12)
          .optional()
          .describe("Library asset IDs to use as Grok reference images"),
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
    linkReferenceAssets,
    webSearch,
    startGeneration,
    getGenerationStatus,
  ];
}
