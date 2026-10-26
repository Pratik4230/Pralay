import type { Context } from "hono";

import {
  assistantThreadNotFoundError,
  createApiError,
  createProjectAssistantThreadBodySchema,
  createProjectAssistantThreadResponseSchema,
  deleteProjectAssistantThreadResponseSchema,
  forbiddenError,
  listProjectAssistantMessagesQuerySchema,
  listProjectAssistantMessagesResponseSchema,
  listAssistantRunEventsQuerySchema,
  listAssistantRunEventsResponseSchema,
  mutateAssistantRunResponseSchema,
  listProjectAssistantThreadsResponseSchema,
  projectNotFoundError,
  sendProjectAssistantMessageBodySchema,
  sendProjectAssistantMessageResponseSchema,
  submitProjectAssistantMessageResponseSchema,
  unauthorizedError,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import { createProjectAssistantMessageStream } from "../services/create-assistant-stream.service.js";
import {
  AssistantMessageListCursorError,
  AssistantThreadNotFoundError,
  createProjectAssistantThread,
  deleteProjectAssistantThread,
  listProjectAssistantMessages,
  listProjectAssistantThreads,
  sendProjectAssistantMessage,
  submitProjectAssistantMessage,
} from "../services/project-assistant.service.js";
import {
  AssistantRunConflictError,
  AssistantRunNotFoundError,
  cancelProjectAssistantRun,
  listProjectAssistantRunEvents,
  mapAssistantRun,
  retryProjectAssistantRun,
} from "../services/assistant-runs.service.js";
import { inngest } from "../../../inngest/client.js";
import { ProjectNotFoundError } from "../../projects/services/workspace-projects.service.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";

const invalidMessageCursorError = createApiError(
  "VALIDATION_ERROR",
  "Invalid pagination cursor",
);
const assistantRunNotFoundError = createApiError(
  "NOT_FOUND",
  "Assistant run not found",
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

export async function deleteProjectAssistantThreadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  const threadId = c.req.param("threadId");
  if (!workspaceId || !projectId || !threadId) {
    return c.json(assistantThreadNotFoundError, 404);
  }

  try {
    const result = await deleteProjectAssistantThread(
      session.user.id,
      workspaceId,
      projectId,
      threadId,
    );
    return c.json(
      deleteProjectAssistantThreadResponseSchema.parse(result),
      200,
    );
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
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
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

    return c.json(
      listProjectAssistantMessagesResponseSchema.parse(result),
      200,
    );
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

export async function streamProjectAssistantMessageController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  const body = sendProjectAssistantMessageBodySchema.parse(await c.req.json());

  try {
    const stream = createProjectAssistantMessageStream(
      session.user.id,
      workspaceId,
      projectId,
      body,
    );

    return c.newResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
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

export async function submitProjectAssistantMessageController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  const body = sendProjectAssistantMessageBodySchema.parse(await c.req.json());

  try {
    const result = await submitProjectAssistantMessage(
      session.user.id,
      workspaceId,
      projectId,
      body,
    );

    return c.json(
      submitProjectAssistantMessageResponseSchema.parse(result),
      202,
    );
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

export async function listProjectAssistantRunEventsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const { workspaceId, projectId } = workspaceProjectParams(c);
  const runId = c.req.param("runId");
  if (!workspaceId || !projectId || !runId) {
    return c.json(assistantRunNotFoundError, 404);
  }
  const query = listAssistantRunEventsQuerySchema.parse({
    after: c.req.query("after"),
  });

  try {
    const result = await listProjectAssistantRunEvents(
      session.user.id,
      workspaceId,
      projectId,
      runId,
      query.after,
    );
    return c.json(listAssistantRunEventsResponseSchema.parse(result), 200);
  } catch (error) {
    if (
      error instanceof AssistantRunNotFoundError ||
      error instanceof ProjectNotFoundError ||
      error instanceof WorkspaceAccessError
    ) {
      return c.json(assistantRunNotFoundError, 404);
    }
    throw error;
  }
}

export async function cancelProjectAssistantRunController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const { workspaceId, projectId } = workspaceProjectParams(c);
  const runId = c.req.param("runId");
  if (!workspaceId || !projectId || !runId) {
    return c.json(assistantRunNotFoundError, 404);
  }

  try {
    const run = await cancelProjectAssistantRun(
      session.user.id,
      workspaceId,
      projectId,
      runId,
    );
    await inngest.send({
      name: "pralay/assistant-turn.cancelled",
      data: { runId },
    });
    return c.json(
      mutateAssistantRunResponseSchema.parse({ run: mapAssistantRun(run) }),
      200,
    );
  } catch (error) {
    if (error instanceof AssistantRunConflictError) {
      return c.json(createApiError("CONFLICT", error.message), 409);
    }
    if (
      error instanceof AssistantRunNotFoundError ||
      error instanceof ProjectNotFoundError ||
      error instanceof WorkspaceAccessError
    ) {
      return c.json(assistantRunNotFoundError, 404);
    }
    throw error;
  }
}

export async function retryProjectAssistantRunController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const { workspaceId, projectId } = workspaceProjectParams(c);
  const runId = c.req.param("runId");
  if (!workspaceId || !projectId || !runId) {
    return c.json(assistantRunNotFoundError, 404);
  }

  try {
    const run = await retryProjectAssistantRun(
      session.user.id,
      workspaceId,
      projectId,
      runId,
    );
    await inngest.send({
      name: "pralay/assistant-turn.requested",
      data: {
        actorUserId: session.user.id,
        workspaceId,
        projectId,
        threadId: run.threadId,
        userMessageId: run.userMessageId,
        runId: run.id,
        body: run.input,
      },
    });
    return c.json(
      mutateAssistantRunResponseSchema.parse({ run: mapAssistantRun(run) }),
      202,
    );
  } catch (error) {
    if (error instanceof AssistantRunConflictError) {
      return c.json(createApiError("CONFLICT", error.message), 409);
    }
    if (
      error instanceof AssistantRunNotFoundError ||
      error instanceof ProjectNotFoundError ||
      error instanceof WorkspaceAccessError
    ) {
      return c.json(assistantRunNotFoundError, 404);
    }
    throw error;
  }
}
