"use client";

import { useCallback } from "react";

import {
  WorkspaceCard,
  WorkspaceCardSkeleton,
} from "@/features/workspace/components/workspace-card";
import { useInfiniteScrollSentinel } from "@/features/workspace/hooks/use-infinite-scroll-sentinel";
import { useInfiniteWorkspaces } from "@/features/workspace/hooks/use-workspaces";
import { Button } from "@repo/ui/components/button";
import { PlusIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

type WorkspaceListProps = {
  onCreateClick: () => void;
  viewMode?: "grid" | "list";
};

export function WorkspaceList({
  onCreateClick,
  viewMode = "grid",
}: WorkspaceListProps) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteWorkspaces();

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sentinelRef = useInfiniteScrollSentinel({
    enabled: Boolean(hasNextPage && !isFetchingNextPage),
    onLoadMore: loadMore,
  });

  const skeletonCount = viewMode === "grid" ? 6 : 4;

  if (isLoading) {
    return (
      <div className={gridClass(viewMode)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <WorkspaceCardSkeleton key={i} viewMode={viewMode} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  const workspaces = data?.pages.flatMap((page) => page.workspaces) ?? [];
  const total = workspaces.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          You do not have any workspaces yet.
        </p>
        <Button className="mt-4 gap-1.5" onClick={onCreateClick} size="sm">
          <PlusIcon className="size-3.5" />
          Create your first workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* workspace count */}
      <p className="text-xs text-muted-foreground">
        {total} workspace{total !== 1 ? "s" : ""}
      </p>

      <div className={gridClass(viewMode)}>
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} viewMode={viewMode} />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 3 }).map((_, i) => (
              <WorkspaceCardSkeleton key={`loading-${i}`} viewMode={viewMode} />
            ))
          : null}
      </div>

      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {!hasNextPage && total > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          You have reached the end of your workspaces.
        </p>
      ) : null}
    </div>
  );
}

function gridClass(viewMode: "grid" | "list") {
  return cn(
    viewMode === "grid"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "flex flex-col gap-2",
  );
}
