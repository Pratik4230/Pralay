"use client";

import {
  ChevronDownIcon,
  MessageSquareIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";

import type { CreateThread } from "@/features/create/types/create-ui";

type CreateThreadSelectorProps = {
  threads: CreateThread[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
};

export function CreateThreadSelector({
  threads,
  activeThreadId,
  onSelect,
  onCreate,
}: CreateThreadSelectorProps) {
  const active =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-[220px] justify-between gap-2"
          >
            <MessageSquareIcon className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{active?.title ?? "Thread"}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {threads.map((thread) => (
            <DropdownMenuItem
              key={thread.id}
              className={cn(
                thread.id === activeThreadId && "bg-primary/10 text-primary",
              )}
              onClick={() => onSelect(thread.id)}
            >
              <span className="truncate">{thread.title}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="New thread"
        onClick={onCreate}
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}
