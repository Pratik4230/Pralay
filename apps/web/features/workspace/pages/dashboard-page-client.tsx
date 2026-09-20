"use client";

import { useState } from "react";
import { LayoutGridIcon, LayoutListIcon, PlusIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import { CreateWorkspaceDialog } from "@/features/workspace/components/create-workspace-dialog";
import { WorkspaceList } from "@/features/workspace/components/workspace-list";
import { getRandomQuote } from "@/features/workspace/utils/dashboard-quotes";
import type { MeResponse } from "@/features/workspace/types";

type DashboardPageClientProps = {
  user: MeResponse["user"];
};

export function DashboardPageClient({ user }: DashboardPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Stable per page load — changes only on refresh
  const [quote] = useState(() => getRandomQuote());

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="flex min-h-full flex-col">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-secondary/40 dark:bg-secondary/20">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase">
              IDEAS
              <span className="text-muted-foreground">→</span>
              VISUALS
              <span className="text-muted-foreground">→</span>
              IMPACT
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Welcome back, <span className="text-primary">{firstName}.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your creative workspaces, all in one place.
              <br className="hidden sm:block" />
              Pick a workspace to continue creating.
            </p>
          </div>

          {/* Right: decorative panel */}
          <div className="relative hidden lg:flex h-36 w-64 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-secondary to-muted">
            <div className="absolute right-6 top-4 size-20 rounded-full bg-primary/60 blur-2xl" />
            <div className="absolute bottom-2 left-4 size-14 rounded-full bg-foreground/10 blur-xl" />
            <div className="relative flex flex-col items-end gap-1 pr-4 text-right">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
                Same Ideas
              </span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
                Bigger
              </span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
                Possibilities
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        {/* Workspace section */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">
              Your workspaces
            </h2>
            <div className="flex items-center gap-2">
              {/* Grid / List toggle */}
              <div className="flex items-center rounded-lg border border-border/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGridIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="List view"
                >
                  <LayoutListIcon className="size-3.5" />
                </button>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-1.5"
                size="sm"
              >
                <PlusIcon className="size-3.5" />
                New workspace
              </Button>
            </div>
          </div>

          <WorkspaceList
            viewMode={viewMode}
            onCreateClick={() => setCreateOpen(true)}
          />
        </section>

        {/* ── Create workspace CTA row ────────────────────────── */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="group flex w-full items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/60 dark:bg-secondary/20"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border/80 text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
            <PlusIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Create a new workspace</p>
            <p className="text-sm text-muted-foreground">
              Start a new creative environment for your ideas, brand or client.
            </p>
          </div>
          <span className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {/* ── Footer quote ─────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border/60 bg-secondary/30 px-4 py-8 sm:px-6 dark:bg-secondary/10">
        <div className="mx-auto max-w-7xl">
          <p className="font-serif text-base italic text-foreground/80 sm:text-lg">
            &ldquo;{quote.text}&rdquo;
          </p>
          {quote.author ? (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              — {quote.author}
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-primary">
              PRALAY
            </span>
            <span className="h-px w-8 bg-primary" />
          </div>
        </div>
      </footer>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
