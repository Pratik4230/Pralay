import Link from "next/link";
import Image from "next/image";

import { cn } from "@repo/ui/lib/utils";
import type { Project } from "@repo/validators";

import { formatUpdatedAgo } from "@/features/workspace/utils/format-updated-ago";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";
import { getMediaUrl } from "@/global/utils/media-url";

function getProjectGradient(name: string) {
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
  return colors[colorIdx];
}

function OverviewProjectCover({
  name,
  coverKey,
}: {
  name: string;
  coverKey: string | null;
}) {
  const imageUrl = getMediaUrl(coverKey);
  const gradient = getProjectGradient(name);

  if (imageUrl) {
    return (
      <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={`${name} cover`}
          fill
          unoptimized
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-16/10 w-full items-center justify-center bg-linear-to-br",
        gradient,
      )}
    >
      <span className="text-3xl font-bold text-white/90">
        {name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("")}
      </span>
    </div>
  );
}

export function OverviewProjectCard({
  project,
  workspaceId,
}: {
  project: Project;
  workspaceId: string;
}) {
  const href = `${getWorkspaceBasePath(workspaceId)}/projects/${project.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/30 hover:shadow-md hover:shadow-foreground/5"
    >
      <OverviewProjectCover name={project.name} coverKey={project.coverKey} />
      <div className="flex flex-col gap-1 p-4">
        <h3 className="truncate font-semibold tracking-tight">{project.name}</h3>
        <p className="text-xs text-muted-foreground">
          {formatUpdatedAgo(project.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

export function OverviewProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="aspect-16/10 w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
