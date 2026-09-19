import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";

import { db } from "@repo/db";
import { projects } from "@repo/db/schema";
import {
  buildProjectCoverKey,
  createPresignedUploadUrl,
  deleteObject,
  isStorageConfigured,
  parseProjectIdFromCoverKey,
} from "@repo/storage";
import type {
  CreateWorkspaceProjectBody,
  ListWorkspaceProjectsQuery,
  UpdateWorkspaceProjectBody,
} from "@repo/validators";

import {
  requireWorkspaceAdmin,
  requireWorkspaceMembership,
  requireWorkspaceOwner,
  WorkspaceAccessError,
  WorkspaceForbiddenError,
} from "../../workspace/services/workspace-access.service.js";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectNotArchivedError extends Error {
  constructor() {
    super("Project must be archived before it can be moved to trash");
    this.name = "ProjectNotArchivedError";
  }
}

export class InvalidProjectCoverKeyError extends Error {
  constructor() {
    super("Cover key is not valid for this project");
    this.name = "InvalidProjectCoverKeyError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

export { WorkspaceAccessError, WorkspaceForbiddenError };

// ─── Slug ─────────────────────────────────────────────────────────────────────

function slugifyProjectName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Generates a slug unique within the workspace.
 * e.g. "BMSD 2026" → "bmsd-2026", collision → "bmsd-2026-2", "bmsd-2026-3"
 * Pass excludeProjectId when renaming (skip the current project's own slug).
 */
async function createUniqueProjectSlug(
  workspaceId: string,
  name: string,
  excludeProjectId?: string,
): Promise<string> {
  const base = slugifyProjectName(name) || "project";
  let attempt = 0;

  while (attempt < 20) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const conditions = [
      eq(projects.workspaceId, workspaceId),
      eq(projects.slug, candidate),
    ];
    if (excludeProjectId) {
      conditions.push(ne(projects.id, excludeProjectId));
    }

    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(...conditions))
      .limit(1);

    if (existing.length === 0) return candidate;
    attempt += 1;
  }

  return `${base}-${Date.now()}`;
}

// ─── Shape ────────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  coverKey: string | null;
  status: "active" | "archived";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const projectSelect = {
  id: projects.id,
  workspaceId: projects.workspaceId,
  name: projects.name,
  slug: projects.slug,
  description: projects.description,
  coverKey: projects.coverKey,
  status: projects.status,
  createdBy: projects.createdBy,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

function mapProjectRow(row: ProjectRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverKey: row.coverKey,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  input: CreateWorkspaceProjectBody,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const slug = await createUniqueProjectSlug(workspaceId, input.name);

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() ?? null,
      createdBy: actorUserId,
    })
    .returning(projectSelect);

  if (!project) {
    throw new Error("Failed to create project");
  }

  return mapProjectRow(project as ProjectRow);
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listWorkspaceProjects(
  actorUserId: string,
  workspaceId: string,
  query: ListWorkspaceProjectsQuery,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const conditions = [
    eq(projects.workspaceId, workspaceId),
    isNull(projects.deletedAt),
  ];

  if (query.status !== "all") {
    conditions.push(eq(projects.status, query.status));
  }

  const rows = await db
    .select(projectSelect)
    .from(projects)
    .where(and(...conditions))
    .orderBy(projects.createdAt);

  return rows.map((r) => mapProjectRow(r as ProjectRow));
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const [row] = await db
    .select(projectSelect)
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new ProjectNotFoundError();

  return mapProjectRow(row as ProjectRow);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: UpdateWorkspaceProjectBody,
) {
  // Status changes (archive/restore) require admin or owner.
  // All other field updates (name, description, coverKey) only need membership.
  if (input.status !== undefined) {
    await requireWorkspaceAdmin(actorUserId, workspaceId);
  } else {
    await requireWorkspaceMembership(actorUserId, workspaceId);
  }

  // Validate cover key belongs to this project
  if (input.coverKey !== undefined && input.coverKey !== null) {
    const keyProjectId = parseProjectIdFromCoverKey(input.coverKey);
    if (keyProjectId !== projectId) {
      throw new InvalidProjectCoverKeyError();
    }
  }

  // Fetch current state if we need the coverKey for cleanup or need to confirm existence
  const [existing] = await db
    .select({ coverKey: projects.coverKey, id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) throw new ProjectNotFoundError();
  const previousCoverKey = existing.coverKey ?? null;

  // Generate new slug if name changed
  let newSlug: string | undefined;
  if (input.name !== undefined) {
    newSlug = await createUniqueProjectSlug(workspaceId, input.name, projectId);
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined
        ? { name: input.name.trim(), slug: newSlug }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() ?? null }
        : {}),
      ...(input.coverKey !== undefined ? { coverKey: input.coverKey } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
        isNull(projects.deletedAt),
      ),
    )
    .returning(projectSelect);

  if (!updated) throw new ProjectNotFoundError();

  // Best-effort: delete old cover from S3
  if (
    input.coverKey !== undefined &&
    previousCoverKey &&
    previousCoverKey !== input.coverKey
  ) {
    try {
      await deleteObject(previousCoverKey);
    } catch {
      // Non-fatal
    }
  }

  return mapProjectRow(updated as ProjectRow);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  // Move to trash requires admin or owner role
  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const [existing] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) throw new ProjectNotFoundError();

  // Projects must be archived before moving to trash
  if (existing.status !== "archived") {
    throw new ProjectNotArchivedError();
  }

  // Soft delete — moves to Trash with 29-day recovery window
  await db
    .update(projects)
    .set({
      deletedAt: new Date(),
      deletedBy: actorUserId,
    })
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    );
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restoreWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  await requireWorkspaceAdmin(actorUserId, workspaceId);

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
        isNotNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) throw new ProjectNotFoundError();

  await db
    .update(projects)
    .set({
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    );
}

// ─── Permanent Delete ─────────────────────────────────────────────────────────

export async function permanentlyDeleteWorkspaceProject(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
) {
  // Permanent delete is owner-only
  await requireWorkspaceOwner(actorUserId, workspaceId);

  const [existing] = await db
    .select({ coverKey: projects.coverKey })
    .from(projects)
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    )
    .limit(1);

  if (!existing) throw new ProjectNotFoundError();

  await db
    .delete(projects)
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    );

  // Best-effort S3 cleanup
  if (existing.coverKey) {
    try {
      await deleteObject(existing.coverKey);
    } catch {
      // Non-fatal
    }
  }
}

// ─── Cover upload (presigned URL) ─────────────────────────────────────────────

export async function createProjectCoverUpload(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  contentType: string,
  fileName?: string,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await requireWorkspaceMembership(actorUserId, workspaceId);

  // Verify project belongs to this workspace
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    )
    .limit(1);

  if (!existing) throw new ProjectNotFoundError();

  const coverKey = buildProjectCoverKey(projectId, contentType, fileName);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
    key: coverKey,
    contentType,
  });

  return { coverKey, uploadUrl, expiresIn };
}
