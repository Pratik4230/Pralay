import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import {
  apiErrorSchema,
  createProjectAssistantThreadBodySchema,
  createProjectAssistantThreadResponseSchema,
  deleteProjectAssistantThreadResponseSchema,
  listProjectAssistantMessagesQuerySchema,
  listProjectAssistantMessagesResponseSchema,
  listProjectAssistantThreadsResponseSchema,
  sendProjectAssistantMessageBodySchema,
  sendProjectAssistantMessageResponseSchema,
} from "@repo/validators";

const workspaceProjectParamsSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
});

const workspaceProjectThreadParamsSchema = workspaceProjectParamsSchema.extend({
  threadId: z.uuid(),
});

export const listProjectAssistantThreadsRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/assistant/threads",
  tags: ["Assistant"],
  summary: "List Create assistant threads for a project",
  request: {
    params: workspaceProjectParamsSchema,
  },
  responses: {
    200: {
      description: "Project assistant threads",
      content: {
        "application/json": {
          schema: listProjectAssistantThreadsResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace or project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const createProjectAssistantThreadRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/assistant/threads",
  tags: ["Assistant"],
  summary: "Create a Create assistant thread",
  request: {
    params: workspaceProjectParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: createProjectAssistantThreadBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Thread created",
      content: {
        "application/json": {
          schema: createProjectAssistantThreadResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace or project not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const deleteProjectAssistantThreadRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/assistant/threads/{threadId}",
  tags: ["Assistant"],
  summary: "Permanently delete a Create assistant thread",
  description:
    "Permanently deletes the thread and its messages. Generated assets remain in the project library.",
  request: {
    params: workspaceProjectThreadParamsSchema,
  },
  responses: {
    200: {
      description: "Thread deleted",
      content: {
        "application/json": {
          schema: deleteProjectAssistantThreadResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Not permitted to delete this thread",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace, project, or thread not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const listProjectAssistantMessagesRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/assistant/threads/{threadId}/messages",
  tags: ["Assistant"],
  summary: "List messages in a Create assistant thread",
  description:
    "Returns messages in chronological order. Pass cursor from nextCursor to load older messages.",
  request: {
    params: workspaceProjectThreadParamsSchema,
    query: listProjectAssistantMessagesQuerySchema,
  },
  responses: {
    200: {
      description: "Message page",
      content: {
        "application/json": {
          schema: listProjectAssistantMessagesResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid cursor",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace, project, or thread not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const sendProjectAssistantMessageRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{id}/projects/{projectId}/assistant/messages",
  tags: ["Assistant"],
  summary: "Send a Create message",
  description:
    "Persists the user message and a placeholder assistant reply until LangGraph streaming is wired.",
  request: {
    params: workspaceProjectParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: sendProjectAssistantMessageBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Messages saved",
      content: {
        "application/json": {
          schema: sendProjectAssistantMessageResponseSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    404: {
      description: "Workspace, project, or thread not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});
