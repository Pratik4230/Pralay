import type { Context } from "hono";

import {
  createWorkspaceBodySchema,
  deleteWorkspaceResponseSchema,
  forbiddenError,
  unauthorizedError,
  updateWorkspaceBodySchema,
  workspaceListResponseSchema,
  workspaceNotFoundError,
  workspaceResponseSchema,
  workspaceSlugTakenError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/workspace-access.service.js";
import {
  createWorkspaceForUser,
  deleteWorkspaceForUser,
  getWorkspaceForUser,
  listWorkspacesForUser,
  mapWorkspaceRow,
  updateWorkspaceForUser,
  WorkspaceSlugTakenError,
} from "../services/workspaces.service.js";

type MappedWorkspace = ReturnType<typeof mapWorkspaceRow>;

function toWorkspaceResponse(workspace: MappedWorkspace) {
  return workspaceResponseSchema.parse({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      avatarKey: workspace.avatarKey,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    },
    membership: {
      role: workspace.role,
      joinedAt: workspace.joinedAt,
    },
  });
}

export async function listWorkspacesController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaces = await listWorkspacesForUser(session.user.id);
  return c.json(workspaceListResponseSchema.parse({ workspaces }), 200);
}

export async function createWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const body = createWorkspaceBodySchema.parse(await c.req.json());

  try {
    const workspace = await createWorkspaceForUser(session.user.id, body);
    return c.json(toWorkspaceResponse(workspace), 201);
  } catch (error) {
    if (error instanceof WorkspaceSlugTakenError) {
      return c.json(workspaceSlugTakenError, 409);
    }
    throw error;
  }
}

export async function getWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const workspace = await getWorkspaceForUser(session.user.id, workspaceId);
  if (!workspace) return c.json(workspaceNotFoundError, 404);

  return c.json(toWorkspaceResponse(workspace), 200);
}

export async function updateWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = updateWorkspaceBodySchema.parse(await c.req.json());

  try {
    const workspace = await updateWorkspaceForUser(
      session.user.id,
      workspaceId,
      body,
    );
    return c.json(toWorkspaceResponse(workspace), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof WorkspaceSlugTakenError) {
      return c.json(workspaceSlugTakenError, 409);
    }
    throw error;
  }
}

export async function deleteWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    const result = await deleteWorkspaceForUser(session.user.id, workspaceId);
    return c.json(deleteWorkspaceResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    throw error;
  }
}
