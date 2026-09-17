"use client";

import { useCallback } from "react";

import { Button } from "@repo/ui/components/button";

import {
  WorkspaceCard,
  WorkspaceCardSkeleton,
} from "@/features/workspace/components/workspace-card";
import { useInfiniteScrollSentinel } from "@/features/workspace/hooks/use-infinite-scroll-sentinel";
import { useInfiniteWorkspaces } from "@/features/workspace/hooks/use-workspaces";

export function WorkspaceList({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
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

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6">
        <WorkspaceListHeader onCreateClick={onCreateClick} />
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <WorkspaceCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-6">
        <WorkspaceListHeader onCreateClick={onCreateClick} />
        <p className="text-sm text-destructive">{error.message}</p>
      </section>
    );
  }

  const workspaces = data?.pages.flatMap((page) => page.workspaces) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <WorkspaceListHeader onCreateClick={onCreateClick} />

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            You do not have any workspaces yet.
          </p>
          <Button className="mt-4" onClick={onCreateClick}>
            Create your first workspace
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
            {isFetchingNextPage
              ? Array.from({ length: 4 }).map((_, index) => (
                  <WorkspaceCardSkeleton key={`loading-${index}`} />
                ))
              : null}
          </div>

          <div ref={sentinelRef} className="h-px w-full" aria-hidden />

          {!hasNextPage && workspaces.length > 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              You have reached the end of your workspaces.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function WorkspaceListHeader({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Your workspaces
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a workspace to manage members, invites, and settings.
        </p>
      </div>
      <Button onClick={onCreateClick} className="shrink-0">
        New workspace
      </Button>
    </div>
  );
}
