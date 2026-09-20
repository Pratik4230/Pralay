import Link from "next/link";
import Image from "next/image";
import {
  MoreHorizontalIcon,
  FolderIcon,
  ImageIcon,
  UsersIcon,
} from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

import type { WorkspaceWithMembership } from "@/features/workspace/types";
import { getWorkspaceInitials } from "@/features/workspace/utils/workspace-helpers";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceCardProps = {
  workspace: WorkspaceWithMembership;
  viewMode?: "grid" | "list";
};

// Deterministic pastel gradient per workspace (based on name)
function getWorkspaceGradient(name: string) {
  const gradients = [
    "from-orange-900/80 via-orange-800/60 to-stone-900",
    "from-stone-800/80 via-stone-700/60 to-zinc-900",
    "from-zinc-800/80 via-slate-700/60 to-gray-900",
    "from-amber-900/80 via-yellow-800/50 to-stone-900",
    "from-neutral-800/80 via-stone-700/60 to-zinc-900",
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export function WorkspaceCard({
  workspace,
  viewMode = "grid",
}: WorkspaceCardProps) {
  const coverUrl = getMediaUrl(workspace.coverImageKey);
  const avatarUrl = getMediaUrl(workspace.avatarKey);
  const initials = getWorkspaceInitials(workspace.name);
  const gradient = getWorkspaceGradient(workspace.name);

  if (viewMode === "list") {
    return (
      <Link
        href={`/dashboard/workspaces/${workspace.id}`}
        className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/30 hover:bg-card/80"
      >
        {/* Avatar */}
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center bg-linear-to-br",
                gradient,
              )}
            >
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="block text-sm font-semibold hover:text-primary truncate">
            {workspace.name}
          </p>
          {workspace.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {workspace.description}
            </p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1">
            <FolderIcon className="size-3" />
            {workspace.stats.projectCount}
          </span>
          <span className="flex items-center gap-1">
            <ImageIcon className="size-3" />
            {workspace.stats.assetCount}
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3" />
            {workspace.stats.memberCount}
          </span>
        </div>

        <div onClick={(e) => e.preventDefault()}>
          <WorkspaceMenu workspaceId={workspace.id} />
        </div>
      </Link>
    );
  }

  // ── Grid card ─────────────────────────────────────────────
  return (
    <Link
      href={`/dashboard/workspaces/${workspace.id}`}
      className="group flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-md hover:shadow-foreground/5"
    >
      {/* Cover image area */}
      <div className="relative h-44 w-full overflow-hidden bg-muted sm:h-48">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={cn("flex size-full bg-linear-to-br", gradient)}>
            <div className="flex size-full flex-col items-center justify-center gap-1 opacity-30">
              <span className="text-[10px] font-bold tracking-[0.3em] text-white uppercase">
                Build
              </span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-white uppercase">
                Create
              </span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-white uppercase">
                Grow
              </span>
            </div>
          </div>
        )}

        {/* Avatar overlaid bottom-left */}
        <div className="absolute bottom-3 left-3 size-10 overflow-hidden rounded-lg border-2 border-background shadow-md">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-foreground">
              <span className="text-sm font-bold text-background">
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-3">
        {/* Name + menu */}
        <div className="flex items-start justify-between gap-2">
          <p className="block min-w-0 flex-1 text-sm font-semibold leading-snug tracking-tight line-clamp-2">
            {workspace.name}
          </p>
          <div onClick={(e) => e.preventDefault()}>
            <WorkspaceMenu workspaceId={workspace.id} />
          </div>
        </div>

        {/* Description */}
        {workspace.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {workspace.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50">No description</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FolderIcon className="size-3 shrink-0" />
            <span className="font-medium text-foreground">
              {workspace.stats.projectCount}
            </span>
            <span>Projects</span>
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <ImageIcon className="size-3 shrink-0" />
            <span className="font-medium text-foreground">
              {workspace.stats.assetCount}
            </span>
            <span>Assets</span>
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-3 shrink-0" />
            <span className="font-medium text-foreground">
              {workspace.stats.memberCount}
            </span>
            <span>Members</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function WorkspaceMenu({ workspaceId }: { workspaceId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Workspace options"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontalIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <a href={`/dashboard/workspaces/${workspaceId}`}>Open workspace</a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(
              `${window.location.origin}/dashboard/workspaces/${workspaceId}`,
            );
          }}
        >
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceCardSkeleton({
  viewMode = "grid",
}: {
  viewMode?: "grid" | "list";
}) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-3">
        <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="h-44 w-full animate-pulse bg-muted sm:h-48" />
      <div className="flex flex-col gap-3 p-3">
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
        <div className="flex gap-3 border-t border-border/50 pt-2.5">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
