"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";

import { useUpdateWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";

type ProjectSettingsFormProps = {
  workspaceId: string;
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialStatus: "active" | "archived";
};

export function ProjectSettingsForm({
  workspaceId,
  projectId,
  initialName,
  initialDescription,
  initialStatus,
}: ProjectSettingsFormProps) {
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

      <Card
        className={
          initialStatus === "archived"
            ? "border-amber-300 dark:border-amber-800"
            : ""
        }
      >
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
