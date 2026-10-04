"use client";

import {
  ChevronDownIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";

import type { CreateThread } from "@/features/create/types/create-ui";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";

type CreateThreadSelectorProps = {
  threads: CreateThread[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
  onDelete: (threadId: string) => Promise<void>;
  isDeleting: boolean;
};

export function CreateThreadSelector({
  threads,
  activeThreadId,
  onSelect,
  onCreate,
  onDelete,
  isDeleting,
}: CreateThreadSelectorProps) {
  const [threadToDelete, setThreadToDelete] = useState<CreateThread | null>(
    null,
  );
  const active = threads.find((thread) => thread.id === activeThreadId) ?? null;

  const label = active?.title ?? "New conversation";

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
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {threads.map((thread) => (
            <DropdownMenuItem
              key={thread.id}
              className={cn(
                "group flex items-center gap-2",
                thread.id === activeThreadId && "bg-primary/10 text-primary",
              )}
              onSelect={() => onSelect(thread.id)}
            >
              <span className="min-w-0 flex-1 truncate">{thread.title}</span>
              <button
                type="button"
                className="rounded-sm p-1 text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`Delete ${thread.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setThreadToDelete(thread);
                }}
              >
                <Trash2Icon className="size-3.5" />
              </button>
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
      <ConfirmAlertDialog
        open={threadToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setThreadToDelete(null);
        }}
        title="Delete conversation?"
        description="This permanently deletes this conversation and all of its messages. Generated images and project assets will remain in your library."
        confirmLabel="Delete conversation"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!threadToDelete) return;
          await onDelete(threadToDelete.id);
          setThreadToDelete(null);
        }}
      />
    </div>
  );
}
