import type { Context } from "hono";

import {
  createProjectGenerationBodySchema,
  createProjectGenerationResponseSchema,
  generationNotFoundError,
  generationNotRetryableError,
  getProjectGenerationHistoryResponseSchema,
  getProjectGenerationResponseSchema,
  invalidGenerationInputAssetsError,
  projectNotFoundError,
  retryProjectGenerationResponseSchema,
  unauthorizedError,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  InsufficientCreditsError,
  ProjectBudgetExceededError,
} from "@repo/usage";
import { WorkspaceAccessError } from "../../workspace/services/workspace-access.service.js";
import {
  createProjectGeneration,
  GenerationNotFoundError,
  GenerationNotRetryableError,
  getProjectGeneration,
  getProjectGenerationHistory,
  InvalidGenerationInputAssetsError,
  ProjectNotFoundError,
  retryProjectGeneration,
  StorageNotConfiguredError,
} from "../services/project-generations.service.js";

const storageNotConfiguredError = {
  error: {
    code: "HTTP_ERROR" as const,
    message: "File storage is not configured",
  },
};

function insufficientCreditsError(error: InsufficientCreditsError) {
  return {
    error: {
      code: "INSUFFICIENT_CREDITS" as const,
      message: error.message,
      details: { available: error.available, required: error.required },
    },
  };
}

function projectBudgetExceededError(error: ProjectBudgetExceededError) {
  return {
    error: {
      code: "PROJECT_BUDGET_EXCEEDED" as const,
      message: error.message,
      details: { available: error.available, required: error.required },
    },
  };
}

function workspaceProjectParams(c: Context<{ Variables: AuthVariables }>) {
  return {
    workspaceId: c.req.param("id"),
    projectId: c.req.param("projectId"),
  };
}

export async function createProjectGenerationController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const { workspaceId, projectId } = workspaceProjectParams(c);
  if (!workspaceId || !projectId) return c.json(projectNotFoundError, 404);

  const body = createProjectGenerationBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: body.error.flatten(),
        },
      },
      400,
    );
  }

  try {
    const generation = await createProjectGeneration(
      session.user.id,
      workspaceId,
      projectId,
      body.data,
    );

    return c.json(
      createProjectGenerationResponseSchema.parse({ generation }),
      201,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    if (error instanceof InvalidGenerationInputAssetsError) {
      return c.json(invalidGenerationInputAssetsError, 400);
    }
    if (error instanceof StorageNotConfiguredError) {
      return c.json(storageNotConfiguredError, 503);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json(insufficientCreditsError(error), 402);
    }
    if (error instanceof ProjectBudgetExceededError) {
      return c.json(projectBudgetExceededError(error), 402);
    }
    throw error;
  }
}

export async function getProjectGenerationController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  const generationId = c.req.param("generationId");

  if (!workspaceId || !projectId || !generationId) {
    return c.json(generationNotFoundError, 404);
  }

  try {
    const generation = await getProjectGeneration(
      session.user.id,
      workspaceId,
      projectId,
      generationId,
    );

    return c.json(
      getProjectGenerationResponseSchema.parse({ generation }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof GenerationNotFoundError) {
      return c.json(generationNotFoundError, 404);
    }
    throw error;
  }
}

export async function getProjectGenerationHistoryController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  const generationId = c.req.param("generationId");
  if (!workspaceId || !projectId || !generationId) {
    return c.json(generationNotFoundError, 404);
  }

  try {
    const history = await getProjectGenerationHistory(
      session.user.id,
      workspaceId,
      projectId,
      generationId,
    );
    return c.json(
      getProjectGenerationHistoryResponseSchema.parse(history),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof GenerationNotFoundError) {
      return c.json(generationNotFoundError, 404);
    }
    throw error;
  }
}

export async function retryProjectGenerationController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  const generationId = c.req.param("generationId");
  if (!workspaceId || !projectId || !generationId) {
    return c.json(generationNotFoundError, 404);
  }

  try {
    const generation = await retryProjectGeneration(
      session.user.id,
      workspaceId,
      projectId,
      generationId,
    );
    return c.json(
      retryProjectGenerationResponseSchema.parse({ generation }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (
      error instanceof ProjectNotFoundError ||
      error instanceof GenerationNotFoundError
    ) {
      return c.json(generationNotFoundError, 404);
    }
    if (error instanceof GenerationNotRetryableError) {
      return c.json(generationNotRetryableError, 409);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json(insufficientCreditsError(error), 402);
    }
    if (error instanceof ProjectBudgetExceededError) {
      return c.json(projectBudgetExceededError(error), 402);
    }
    throw error;
  }
}
