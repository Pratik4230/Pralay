import type { Context } from "hono";

import {
  acceptWorkspaceInviteBodySchema,
  acceptWorkspaceInviteResponseSchema,
  createWorkspaceInviteBodySchema,
  forbiddenError,
  inviteConflictError,
  inviteInvalidError,
  inviteNotFoundError,
  memberConflictError,
  unauthorizedError,
  workspaceInviteListResponseSchema,
  workspaceInviteResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/workspace-access.service.js";
import { MemberConflictError } from "../services/workspace-members.service.js";
import {
  acceptWorkspaceInvite,
  createWorkspaceInvite,
  InviteConflictError,
  InviteInvalidError,
  InviteNotFoundError,
  listWorkspaceInvites,
  revokeWorkspaceInvite,
} from "../services/workspace-invites.service.js";

export async function listWorkspaceInvitesController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    const invites = await listWorkspaceInvites(session.user.id, workspaceId);
    return c.json(workspaceInviteListResponseSchema.parse({ invites }), 200);
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

export async function createWorkspaceInviteController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = createWorkspaceInviteBodySchema.parse(await c.req.json());

  try {
    const invite = await createWorkspaceInvite(
      session.user.id,
      workspaceId,
      body,
    );
    return c.json(workspaceInviteResponseSchema.parse({ invite }), 201);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof MemberConflictError) {
      return c.json(memberConflictError, 409);
    }
    if (error instanceof InviteConflictError) {
      return c.json(inviteConflictError, 409);
    }
    throw error;
  }
}

export async function revokeWorkspaceInviteController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const inviteId = c.req.param("inviteId");
  if (!workspaceId || !inviteId) return c.json(inviteNotFoundError, 404);

  try {
    const invite = await revokeWorkspaceInvite(
      session.user.id,
      workspaceId,
      inviteId,
    );
    return c.json(workspaceInviteResponseSchema.parse({ invite }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof InviteNotFoundError) {
      return c.json(inviteNotFoundError, 404);
    }
    throw error;
  }
}

export async function acceptWorkspaceInviteController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const body = acceptWorkspaceInviteBodySchema.parse(await c.req.json());

  try {
    const result = await acceptWorkspaceInvite(
      session.user.id,
      session.user.email,
      body,
    );
    return c.json(acceptWorkspaceInviteResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof InviteInvalidError) {
      return c.json(inviteInvalidError, 400);
    }
    if (error instanceof MemberConflictError) {
      return c.json(memberConflictError, 409);
    }
    throw error;
  }
}
