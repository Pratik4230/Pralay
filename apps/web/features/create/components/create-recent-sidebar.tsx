"use client";

import { Loader2Icon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";

import type { CreateRecentItem } from "@/features/create/types/create-ui";
import { formatUpdatedAgo } from "@/features/workspace/utils/format-updated-ago";

type CreateRecentSidebarProps = {
  items: CreateRecentItem[];
};

export function CreateRecentSidebar({ items }: CreateRecentSidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-border/60 bg-card/20 xl:flex xl:flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Recent creations</h2>
        <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs">
          View all
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Generations from this project will show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <div className="relative aspect-video bg-linear-to-br from-violet-950 via-slate-900 to-orange-950">
                  {item.status === "processing" || item.status === "queued" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2Icon className="size-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white/60">
                      Preview
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatUpdatedAgo(item.updatedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Options"
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
