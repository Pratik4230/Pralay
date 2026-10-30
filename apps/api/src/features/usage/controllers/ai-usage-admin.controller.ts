import type { Context } from "hono";

import {
  adjustWorkspaceCreditsBodySchema,
  projectAiBudgetResponseSchema,
  unauthorizedError,
  updateProjectAiBudgetBodySchema,
  workspaceCreditAdjustmentResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";
import { InsufficientCreditsError } from "@repo/usage";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";
import {
  adjustWorkspaceCredits,
  updateProjectAiBudget,
} from "../services/workspace-usage.service.js";

function forbidden(error: Error) {
  return { error: { code: "FORBIDDEN" as const, message: error.message } };
}

export async function updateProjectAiBudgetController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId || !projectId) return c.json(workspaceNotFoundError, 404);
  const body = updateProjectAiBudgetBodySchema.parse(await c.req.json());
  try {
    const result = await updateProjectAiBudget(
      session.user.id,
      workspaceId,
      projectId,
      body.monthlyLimit,
    );
    return c.json(projectAiBudgetResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError)
      return c.json(workspaceNotFoundError, 404);
    if (error instanceof WorkspaceForbiddenError)
      return c.json(forbidden(error), 403);
    if (error instanceof Error && error.message === "Project not found") {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

export async function adjustWorkspaceCreditsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  const body = adjustWorkspaceCreditsBodySchema.parse(await c.req.json());
  try {
    const result = await adjustWorkspaceCredits(
      session.user.id,
      workspaceId,
      body,
    );
    return c.json(workspaceCreditAdjustmentResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError)
      return c.json(workspaceNotFoundError, 404);
    if (error instanceof WorkspaceForbiddenError)
      return c.json(forbidden(error), 403);
    if (error instanceof InsufficientCreditsError) {
      return c.json(
        {
          error: {
            code: "INSUFFICIENT_CREDITS" as const,
            message: error.message,
          },
        },
        402,
      );
    }
    throw error;
  }
}
