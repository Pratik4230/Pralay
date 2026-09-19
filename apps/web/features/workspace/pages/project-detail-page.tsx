"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import {
  uploadProjectCoverFile,
  useUpdateWorkspaceProject,
  useWorkspaceProject,
} from "@/features/workspace/hooks/use-workspace-projects";
import { getMediaUrl } from "@/global/utils/media-url";

type ProjectTab = "assets" | "settings";

// ─── Cover banner ─────────────────────────────────────────────────────────────

function ProjectCoverBanner({
  workspaceId,
  projectId,
  name,
  coverKey,
}: {
  workspaceId: string;
  projectId: string;
  name: string;
  coverKey: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const update = useUpdateWorkspaceProject(workspaceId, projectId);
  const imageUrl = getMediaUrl(coverKey);

  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const newCoverKey = await uploadProjectCoverFile(
        workspaceId,
        projectId,
        file,
      );
      await update.mutateAsync({ coverKey: newCoverKey });
      toast.success("Cover updated");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemoveCover() {
    try {
      await update.mutateAsync({ coverKey: null });
      toast.success("Cover removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove cover",
      );
    }
  }

  return (
    <div className="relative w-full">
      {/* Banner */}
      <div
        className={cn(
          "relative h-44 w-full overflow-hidden rounded-xl",
          !imageUrl &&
            `bg-gradient-to-br ${colors[colorIdx]}`,
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} cover`}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl font-bold text-white/20 select-none">
              {name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
          </div>
        )}

        {/* Cover controls — overlay on banner */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-xs backdrop-blur-sm bg-black/30 text-white border-white/20 hover:bg-black/50"
            disabled={uploading || update.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : coverKey ? "Change cover" : "Add cover"}
          </Button>
          {coverKey ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs backdrop-blur-sm bg-black/30 text-white border-white/20 hover:bg-black/50"
              disabled={uploading || update.isPending}
              onClick={handleRemoveCover}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {uploadError ? (
        <p className="mt-1 text-xs text-destructive">{uploadError}</p>
      ) : null}
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function ProjectSettingsPanel({
  workspaceId,
  projectId,
  initialName,
  initialDescription,
  initialStatus,
}: {
  workspaceId: string;
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialStatus: "active" | "archived";
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateWorkspaceProject(workspaceId, projectId);

  const isDirty =
    name.trim() !== initialName ||
    description.trim() !== (initialDescription ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });
      toast.success("Project saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleArchiveToggle() {
    const newStatus = initialStatus === "active" ? "archived" : "active";
    try {
      await update.mutateAsync({ status: newStatus });
      toast.success(
        newStatus === "archived" ? "Project archived" : "Project restored",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Name & description card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="proj-name">Name</FieldLabel>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={update.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="proj-desc">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={update.isPending}
                rows={3}
                placeholder="What is this project for?"
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || update.isPending}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Archive / restore card */}
      <Card className={initialStatus === "archived" ? "border-amber-300 dark:border-amber-800" : ""}>
        <CardHeader>
          <CardTitle className="text-base">
            {initialStatus === "active" ? "Archive project" : "Restore project"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {initialStatus === "active"
              ? "Archiving moves this project out of your active list. Nothing is deleted — you can restore it at any time."
              : "This project is archived. Restore it to make it active again."}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant={initialStatus === "active" ? "outline" : "default"}
            size="sm"
            disabled={update.isPending}
            onClick={handleArchiveToggle}
          >
            {update.isPending
              ? "Updating…"
              : initialStatus === "active"
                ? "Archive project"
                : "Restore project"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Project detail page ──────────────────────────────────────────────────────

export function ProjectDetailPage({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const [tab, setTab] = useState<ProjectTab>("assets");
  const { data, isLoading, error } = useWorkspaceProject(
    workspaceId,
    projectId,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Project not found"}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/dashboard/workspaces/${workspaceId}`}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  const { project } = data;
  const tabs: { key: ProjectTab; label: string }[] = [
    { key: "assets", label: "Assets" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      {/* Back nav */}
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/dashboard/workspaces/${workspaceId}`}>
          ← Back to workspace
        </Link>
      </Button>

      {/* Cover banner */}
      <ProjectCoverBanner
        workspaceId={workspaceId}
        projectId={projectId}
        name={project.name}
        coverKey={project.coverKey}
      />

      {/* Project header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                project.status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
              )}
            >
              {project.status}
            </span>
          </div>
          {project.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "assets" ? (
          <WorkspaceAssetsPanel workspaceId={workspaceId} />
        ) : null}
        {tab === "settings" ? (
          <ProjectSettingsPanel
            workspaceId={workspaceId}
            projectId={projectId}
            initialName={project.name}
            initialDescription={project.description}
            initialStatus={project.status}
          />
        ) : null}
      </div>
    </div>
  );
}
