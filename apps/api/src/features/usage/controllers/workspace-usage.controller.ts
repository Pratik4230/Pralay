import type { Context } from "hono";

import {
  unauthorizedError,
  workspaceNotFoundError,
  workspaceUsageQuerySchema,
  workspaceUsageSummaryResponseSchema,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import { WorkspaceAccessError } from "../../workspace/services/workspace-access.service.js";
import { getWorkspaceUsageSummary } from "../services/workspace-usage.service.js";

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
