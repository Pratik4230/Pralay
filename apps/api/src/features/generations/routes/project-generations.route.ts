import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  createProjectGenerationBodySchema,
  createProjectGenerationResponseSchema,
  generationNotFoundError,
  getProjectGenerationResponseSchema,
  invalidGenerationInputAssetsError,
  projectNotFoundError,
  unauthorizedError,
  workspaceNotFoundError,
} from "@repo/validators";

const workspaceProjectParams = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
});

const generationParams = workspaceProjectParams.extend({
  generationId: z.uuid(),
});

export const createProjectGenerationRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/generations",
  tags: ["Generations"],
  summary: "Enqueue a project image generation",
  description:
    "Creates a queued generation job and triggers async Grok Imagine processing via Inngest.",
  request: {
    params: workspaceProjectParams,
    body: {
      content: {
        "application/json": { schema: createProjectGenerationBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "Generation queued",
      content: {
        "application/json": { schema: createProjectGenerationResponseSchema },
      },
    },
    400: {
      description: "Invalid reference assets",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace or project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    503: {
      description: "Storage not configured",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const getProjectGenerationRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/generations/{generationId}",
  tags: ["Generations"],
  summary: "Get a project generation",
  request: { params: generationParams },
  responses: {
    200: {
      description: "Generation",
      content: {
        "application/json": { schema: getProjectGenerationResponseSchema },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});