"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { getProjectBasePath } from "@/features/workspace/utils/project-nav";

type ProjectCreatePageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectCreatePage({
  workspaceId,
  projectId,
}: ProjectCreatePageProps) {
  const basePath = getProjectBasePath(workspaceId, projectId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 w-fit px-0">
          <Link href={basePath}>← Back to overview</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Image Studio is coming soon. This is where you&apos;ll generate
          thumbnails, images, and edits for this project.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </div>
          <CardTitle className="text-base">Image Studio (Phase 2)</CardTitle>
          <CardDescription>
            Prompt-based generation, thumbnail layouts, and editing tools will
            live here, scoped to this project&apos;s assets and brand context.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/assets`}>Browse project assets</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
