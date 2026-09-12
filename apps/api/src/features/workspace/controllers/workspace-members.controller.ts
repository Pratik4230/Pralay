import type { Context } from "hono";

import {
  deleteWorkspaceMemberResponseSchema,
  forbiddenError,
  memberNotFoundError,
  unauthorizedError,
  updateWorkspaceMemberBodySchema,
  workspaceMemberListResponseSchema,
  workspaceMemberResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/workspace-access.service.js";
import {
  listWorkspaceMembers,
  MemberNotFoundError,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../services/workspace-members.service.js";

export async function listWorkspaceMembersController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  try {
    const members = await listWorkspaceMembers(session.user.id, workspaceId);
    return c.json(workspaceMemberListResponseSchema.parse({ members }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

export async function updateWorkspaceMemberController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const memberId = c.req.param("memberId");
  if (!workspaceId || !memberId) return c.json(memberNotFoundError, 404);

  const body = updateWorkspaceMemberBodySchema.parse(await c.req.json());

  try {
    const member = await updateWorkspaceMemberRole(
      session.user.id,
      workspaceId,
      memberId,
      body,
    );
    return c.json(workspaceMemberResponseSchema.parse({ member }), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof MemberNotFoundError) {
      return c.json(memberNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    throw error;
  }
}

export async function deleteWorkspaceMemberController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const memberId = c.req.param("memberId");
  if (!workspaceId || !memberId) return c.json(memberNotFoundError, 404);

  try {
    const result = await removeWorkspaceMember(
      session.user.id,
      workspaceId,
      memberId,
    );
    return c.json(deleteWorkspaceMemberResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof MemberNotFoundError) {
      return c.json(memberNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    throw error;
  }
}
