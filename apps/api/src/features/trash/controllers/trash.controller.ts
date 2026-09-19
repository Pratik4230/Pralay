import type { Context } from "hono";

import {
  createApiError,
  forbiddenError,
  restoreWorkspaceItemBodySchema,
  trashedItemTypeSchema,
  trashedWorkspaceListResponseSchema,
  trashSuccessResponseSchema,
  unauthorizedError,
  workspaceNotFoundError,
  workspaceTrashListResponseSchema,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  getGlobalTrash,
  ItemNotFoundError,
  listProjectTrash,
  listWorkspaceTrash,
  permanentlyDeleteGlobalTrashedWorkspace,
  permanentlyDeleteProjectTrashItem,
  permanentlyDeleteWorkspaceItem,
  restoreGlobalTrashedWorkspace,
  restoreProjectTrashItem,
  restoreWorkspaceItem,
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/trash.service.js";

const itemNotFoundError = createApiError("NOT_FOUND", "Item not found in trash");

// ─── Global Trash ─────────────────────────────────────────────────────────────

export async function listGlobalTrashController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaces = await getGlobalTrash(session.user.id);
  return c.json(trashedWorkspaceListResponseSchema.parse({ workspaces }), 200);
}

export async function restoreGlobalTrashWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    await restoreGlobalTrashedWorkspace(session.user.id, workspaceId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
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

export async function permanentlyDeleteGlobalWorkspaceController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    await permanentlyDeleteGlobalTrashedWorkspace(session.user.id, workspaceId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
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

// ─── Workspace Trash ──────────────────────────────────────────────────────────

export async function listWorkspaceTrashController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    const items = await listWorkspaceTrash(session.user.id, workspaceId);
    return c.json(workspaceTrashListResponseSchema.parse({ items }), 200);
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

export async function restoreWorkspaceItemController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = restoreWorkspaceItemBodySchema.parse(await c.req.json());

  try {
    await restoreWorkspaceItem(session.user.id, workspaceId, body.type, body.itemId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ItemNotFoundError) {
      return c.json(itemNotFoundError, 404);
    }
    throw error;
  }
}

export async function permanentlyDeleteWorkspaceItemController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const type = trashedItemTypeSchema.parse(c.req.param("type"));
  const itemId = c.req.param("itemId");

  if (!workspaceId || !itemId) return c.json(workspaceNotFoundError, 404);

  try {
    await permanentlyDeleteWorkspaceItem(session.user.id, workspaceId, type, itemId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ItemNotFoundError) {
      return c.json(itemNotFoundError, 404);
    }
    throw error;
  }
}

// ─── Project Trash ────────────────────────────────────────────────────────────

export async function listProjectTrashController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId || !projectId) return c.json(workspaceNotFoundError, 404);

  try {
    const items = await listProjectTrash(session.user.id, workspaceId, projectId);
    return c.json(workspaceTrashListResponseSchema.parse({ items }), 200);
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

export async function restoreProjectTrashItemController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  const itemId = c.req.param("itemId");
  if (!workspaceId || !projectId || !itemId) return c.json(workspaceNotFoundError, 404);

  try {
    await restoreProjectTrashItem(session.user.id, workspaceId, projectId, itemId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ItemNotFoundError) {
      return c.json(itemNotFoundError, 404);
    }
    throw error;
  }
}

export async function permanentlyDeleteProjectTrashItemController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  const itemId = c.req.param("itemId");
  if (!workspaceId || !projectId || !itemId) return c.json(workspaceNotFoundError, 404);

  try {
    await permanentlyDeleteProjectTrashItem(session.user.id, workspaceId, projectId, itemId);
    return c.json(trashSuccessResponseSchema.parse({ success: true }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ItemNotFoundError) {
      return c.json(itemNotFoundError, 404);
    }
    throw error;
  }
}
