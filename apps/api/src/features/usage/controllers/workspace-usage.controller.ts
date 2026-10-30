import type { Context } from "hono";

import {
  unauthorizedError,
  workspaceNotFoundError,
  workspaceUsageQuerySchema,
  workspaceUsageSummaryResponseSchema,
  updateWorkspaceUsageBudgetBodySchema,
  workspaceUsageBudgetResponseSchema,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";
import {
  getWorkspaceUsageSummary,
  updateWorkspaceUsageBudget,
} from "../services/workspace-usage.service.js";

export async function getWorkspaceUsageController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  const query = workspaceUsageQuerySchema.parse({ days: c.req.query("days") });

  try {
    const summary = await getWorkspaceUsageSummary(
      session.user.id,
      workspaceId,
      query.days,
    );
    return c.json(workspaceUsageSummaryResponseSchema.parse(summary), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

export async function updateWorkspaceUsageBudgetController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);
  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  const body = updateWorkspaceUsageBudgetBodySchema.parse(await c.req.json());

  try {
    const result = await updateWorkspaceUsageBudget(
      session.user.id,
      workspaceId,
      body.lowCreditThreshold,
    );
    return c.json(workspaceUsageBudgetResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(
        { error: { code: "FORBIDDEN" as const, message: error.message } },
        403,
      );
    }
    throw error;
  }
}
