import type { Context } from "hono";

import {
  assistantThreadNotFoundError,
  createApiError,
  createProjectAssistantThreadBodySchema,
  createProjectAssistantThreadResponseSchema,
  listProjectAssistantMessagesQuerySchema,
  listProjectAssistantMessagesResponseSchema,
  listProjectAssistantThreadsResponseSchema,
  projectNotFoundError,
  sendProjectAssistantMessageBodySchema,
  sendProjectAssistantMessageResponseSchema,
  unauthorizedError,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  AssistantMessageListCursorError,
  AssistantThreadNotFoundError,
  createProjectAssistantThread,
  listProjectAssistantMessages,
  listProjectAssistantThreads,
  sendProjectAssistantMessage,
} from "../services/project-assistant.service.js";
import {
  ProjectNotFoundError,
} from "../../projects/services/workspace-projects.service.js";
import { WorkspaceAccessError } from "../../workspace/services/workspace-access.service.js";

const invalidMessageCursorError = createApiError(
  "VALIDATION_ERROR",
  "Invalid pagination cursor",
);

function workspaceProjectParams(c: Context<{ Variables: AuthVariables }>) {
  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  return { workspaceId, projectId };
}

export async function listProjectAssistantThreadsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  try {
    const threads = await listProjectAssistantThreads(
      session.user.id,
      workspaceId,
      projectId,
    );

    return c.json(
      listProjectAssistantThreadsResponseSchema.parse({ threads }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    throw error;
  }
}

export async function createProjectAssistantThreadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  const body = createProjectAssistantThreadBodySchema.parse(await c.req.json());

  try {
    const thread = await createProjectAssistantThread(
      session.user.id,
      workspaceId,
      projectId,
      body,
    );

    return c.json(
      createProjectAssistantThreadResponseSchema.parse({ thread }),
      201,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    throw error;
  }
}

export async function listProjectAssistantMessagesController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  const threadId = c.req.param("threadId");
  if (!workspaceId || !projectId || !threadId) {
    return c.json(assistantThreadNotFoundError, 404);
  }

  const query = listProjectAssistantMessagesQuerySchema.parse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });

  try {
    const result = await listProjectAssistantMessages(
      session.user.id,
      workspaceId,
      projectId,
      threadId,
      query,
    );

    return c.json(listProjectAssistantMessagesResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    if (error instanceof AssistantThreadNotFoundError) {
      return c.json(assistantThreadNotFoundError, 404);
    }
    if (error instanceof AssistantMessageListCursorError) {
      return c.json(invalidMessageCursorError, 400);
    }
    throw error;
  }
}

export async function sendProjectAssistantMessageController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  const body = sendProjectAssistantMessageBodySchema.parse(await c.req.json());

  try {
    const result = await sendProjectAssistantMessage(
      session.user.id,
      workspaceId,
      projectId,
      body,
    );

    return c.json(sendProjectAssistantMessageResponseSchema.parse(result), 201);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    if (error instanceof AssistantThreadNotFoundError) {
      return c.json(assistantThreadNotFoundError, 404);
    }
    throw error;
  }
}
