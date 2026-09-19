import type { Context } from "hono";

import {
  createApiError,
  createProjectCoverUploadBodySchema,
  createWorkspaceProjectBodySchema,
  createWorkspaceProjectResponseSchema,
  deleteWorkspaceProjectResponseSchema,
  forbiddenError,
  getWorkspaceProjectResponseSchema,
  listWorkspaceProjectsQuerySchema,
  listWorkspaceProjectsResponseSchema,
  projectCoverUploadResponseSchema,
  projectNotFoundError,
  unauthorizedError,
  updateWorkspaceProjectBodySchema,
  updateWorkspaceProjectResponseSchema,
  workspaceNotFoundError,
} from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import {
  createProjectCoverUpload,
  createWorkspaceProject,
  deleteWorkspaceProject,
  getWorkspaceProject,
  InvalidProjectCoverKeyError,
  listWorkspaceProjects,
  ProjectNotArchivedError,
  ProjectNotFoundError,
  StorageNotConfiguredError,
  updateWorkspaceProject,
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../services/workspace-projects.service.js";

const storageNotConfiguredError = createApiError(
  "HTTP_ERROR",
  "File storage is not configured",
);

const invalidCoverKeyError = createApiError(
  "VALIDATION_ERROR",
  "Cover key is not valid for this project",
);

const projectNotArchivedError = createApiError(
  "BAD_REQUEST",
  "Project must be archived before it can be moved to trash",
);

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createWorkspaceProjectController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const body = createWorkspaceProjectBodySchema.parse(await c.req.json());

  try {
    const project = await createWorkspaceProject(
      session.user.id,
      workspaceId,
      body,
    );

    return c.json(
      createWorkspaceProjectResponseSchema.parse({ project }),
      201,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listWorkspaceProjectsController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);

  const query = listWorkspaceProjectsQuerySchema.parse({
    status: c.req.query("status"),
  });

  try {
    const projects = await listWorkspaceProjects(
      session.user.id,
      workspaceId,
      query,
    );

    return c.json(
      listWorkspaceProjectsResponseSchema.parse({ projects }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    throw error;
  }
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getWorkspaceProjectController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  if (!projectId) return c.json(projectNotFoundError, 404);

  try {
    const project = await getWorkspaceProject(
      session.user.id,
      workspaceId,
      projectId,
    );

    return c.json(
      getWorkspaceProjectResponseSchema.parse({ project }),
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

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateWorkspaceProjectController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  if (!projectId) return c.json(projectNotFoundError, 404);

  const body = updateWorkspaceProjectBodySchema.parse(await c.req.json());

  try {
    const project = await updateWorkspaceProject(
      session.user.id,
      workspaceId,
      projectId,
      body,
    );

    return c.json(
      updateWorkspaceProjectResponseSchema.parse({ project }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    if (error instanceof InvalidProjectCoverKeyError) {
      return c.json(invalidCoverKeyError, 400);
    }
    throw error;
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteWorkspaceProjectController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  if (!projectId) return c.json(projectNotFoundError, 404);

  try {
    await deleteWorkspaceProject(session.user.id, workspaceId, projectId);

    return c.json(
      deleteWorkspaceProjectResponseSchema.parse({ success: true }),
      200,
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof WorkspaceForbiddenError) {
      return c.json(forbiddenError, 403);
    }
    if (error instanceof ProjectNotArchivedError) {
      return c.json(projectNotArchivedError, 400);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    throw error;
  }
}

// ─── Cover upload ─────────────────────────────────────────────────────────────

export async function createProjectCoverUploadController(
  c: Context<{ Variables: AuthVariables }>,
) {
  const session = c.get("session");
  if (!session) return c.json(unauthorizedError, 401);

  const workspaceId = c.req.param("id");
  const projectId = c.req.param("projectId");
  if (!workspaceId) return c.json(workspaceNotFoundError, 404);
  if (!projectId) return c.json(projectNotFoundError, 404);

  const body = createProjectCoverUploadBodySchema.parse(await c.req.json());

  try {
    const result = await createProjectCoverUpload(
      session.user.id,
      workspaceId,
      projectId,
      body.contentType,
      body.fileName,
    );

    return c.json(projectCoverUploadResponseSchema.parse(result), 200);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return c.json(storageNotConfiguredError, 503);
    }
    if (error instanceof WorkspaceAccessError) {
      return c.json(workspaceNotFoundError, 404);
    }
    if (error instanceof ProjectNotFoundError) {
      return c.json(projectNotFoundError, 404);
    }
    throw error;
  }
}
