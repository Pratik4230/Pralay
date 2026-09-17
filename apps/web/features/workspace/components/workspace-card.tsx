import Link from "next/link";
import Image from "next/image";

import { cn } from "@repo/ui/lib/utils";

import type { WorkspaceWithMembership } from "@/features/workspace/types";
import { formatUpdatedAgo } from "@/features/workspace/utils/format-updated-ago";
import { getWorkspaceInitials } from "@/features/workspace/utils/workspace-helpers";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceCardProps = {
  workspace: WorkspaceWithMembership;
};

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const imageUrl = getMediaUrl(workspace.avatarKey);
  const updatedLabel = formatUpdatedAgo(workspace.updatedAt);

  return (
    <Link
      href={`/dashboard/workspaces/${workspace.id}`}
      className="group flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-xl bg-muted",
          !imageUrl && "bg-linear-to-br from-primary/15 via-muted to-muted",
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-3xl font-semibold text-primary/80">
              {getWorkspaceInitials(workspace.name)}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight group-hover:text-primary">
          {workspace.name}
        </h3>
        {workspace.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {workspace.description}
          </p>
        ) : (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
            No description
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Updated {updatedLabel}
        </p>
      </div>
    </Link>
  );
}

export function WorkspaceCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2 px-0.5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
