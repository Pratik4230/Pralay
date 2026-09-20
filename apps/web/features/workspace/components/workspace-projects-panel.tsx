"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import type { Project } from "@repo/validators";

import {
  useCreateWorkspaceProject,
  useDeleteWorkspaceProject,
  useUpdateWorkspaceProject,
  useWorkspaceProjects,
} from "@/features/workspace/hooks/use-workspace-projects";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceRole = "owner" | "admin" | "member";
function canManage(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

// ─── Project cover ────────────────────────────────────────────────────────────

function ProjectCover({
  name,
  coverKey,
  size = "card",
}: {
  name: string;
  coverKey: string | null;
  size?: "card" | "sm";
}) {
  const imageUrl = getMediaUrl(coverKey);

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-muted",
          size === "card" ? "h-32 w-full" : "size-10",
        )}
      >
        <Image
          src={imageUrl}
          alt={`${name} cover`}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    );
  }

  // Gradient placeholder derived from project name
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const gradient = colors[colorIdx];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br",
        gradient,
        size === "card" ? "h-32 w-full" : "size-10",
      )}
    >
      <span
        className={cn(
          "font-bold text-white/90",
          size === "card" ? "text-3xl" : "text-sm",
        )}
      >
        {name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("")}
      </span>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  workspaceId,
  role,
  onDelete,
  onRestore,
}: {
  project: Project;
  workspaceId: string;
  role: WorkspaceRole;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const isArchived = project.status === "archived";
  const href = `/dashboard/workspaces/${workspaceId}/projects/${project.id}`;

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        isArchived && "opacity-70",
      )}
    >
      {/* Cover */}
      {isArchived ? (
        <div className="block">
          <ProjectCover name={project.name} coverKey={project.coverKey} />
        </div>
      ) : (
        <Link href={href} className="block">
          <ProjectCover name={project.name} coverKey={project.coverKey} />
        </Link>
      )}

      {/* Info */}
      {isArchived ? (
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="truncate font-semibold text-muted-foreground">
            {project.name}
          </h3>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground/70">
              {project.description}
            </p>
          ) : null}
          <div className="mt-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              archived
            </span>
          </div>
        </div>
      ) : (
        <Link
          href={href}
          className="flex flex-1 flex-col gap-1 p-4 hover:bg-muted/30 transition-colors"
        >
          <h3 className="truncate font-semibold">{project.name}</h3>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
          <div className="mt-2">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              active
            </span>
          </div>
        </Link>
      )}

      {/* Footer — only for archived projects, only for admin/owner */}
      {canManage(role) && isArchived ? (
        <div className="flex items-center justify-end gap-1 border-t px-4 py-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onRestore(project.id)}
          >
            Restore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(project.id)}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Create project dialog ────────────────────────────────────────────────────

function CreateProjectDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateWorkspaceProject(workspaceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setOpen(false);
        },
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to create project",
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <form
          id="create-project-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BMSD 2026"
              maxLength={100}
              disabled={create.isPending}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FieldLabel>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project for?"
              maxLength={500}
              disabled={create.isPending}
              rows={3}
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteProjectDialog({
  projectId,
  projectName,
  workspaceId,
  onClose,
}: {
  projectId: string;
  projectName: string;
  workspaceId: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const deleteProject = useDeleteWorkspaceProject(workspaceId);

  function handleConfirm() {
    setError(null);
    deleteProject.mutate(projectId, {
      onSuccess: onClose,
      onError: (err) =>
        setError(
          err instanceof Error ? err.message : "Failed to delete project",
        ),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{projectName}&rdquo;?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete the project and its cover image. Assets
          in the workspace library are not affected.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={handleConfirm}
          >
            {deleteProject.isPending ? "Deleting..." : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Projects panel ───────────────────────────────────────────────────────────

export function WorkspaceProjectsPanel({
  workspaceId,
  role,
}: {
  workspaceId: string;
  role: WorkspaceRole;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const status = showArchived ? "archived" : "active";
  const { data, isLoading, error } = useWorkspaceProjects(workspaceId, status);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleRestore(projectId: string) {
    setRestoringId(projectId);
    try {
      await fetchApiClient<{ project: Project }>(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
        { method: "PATCH", body: JSON.stringify({ status: "active" }) },
      );
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.projects(workspaceId),
      });
    } finally {
      setRestoringId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load projects"}
      </div>
    );
  }

  const projects = data?.projects ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? showArchived
                ? "No archived projects"
                : "No projects yet"
              : `${projects.length} ${showArchived ? "archived" : "active"} project${projects.length === 1 ? "" : "s"}`}
          </p>
          {canManage(role) ? (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                showArchived
                  ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {showArchived ? "← Active" : "Archived"}
            </button>
          ) : null}
        </div>
        {!showArchived && canManage(role) ? (
          <CreateProjectDialog workspaceId={workspaceId} />
        ) : null}
      </div>

      {/* Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspaceId}
              role={role}
              onDelete={(id) =>
                setDeletingProject(projects.find((p) => p.id === id) ?? null)
              }
              onRestore={handleRestore}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              />
            </svg>
          </div>
          {showArchived ? (
            <>
              <p className="text-sm font-medium">No archived projects</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Archived projects will appear here
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project to get started
              </p>
              {canManage(role) ? (
                <div className="mt-4">
                  <CreateProjectDialog workspaceId={workspaceId} />
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deletingProject ? (
        <DeleteProjectDialog
          projectId={deletingProject.id}
          projectName={deletingProject.name}
          workspaceId={workspaceId}
          onClose={() => setDeletingProject(null)}
        />
      ) : null}
    </div>
  );
}
