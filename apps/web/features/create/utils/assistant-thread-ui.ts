"use client";

import type { AssistantThread } from "@repo/validators";

import type { CreateThread } from "@/features/create/types/create-ui";
import { deriveThreadTitleFromMessage } from "@/features/create/utils/create-thread-title";

export function assistantThreadToCreateThread(
  thread: AssistantThread,
): CreateThread {
  return {
    id: thread.id,
    title: thread.title ?? "New conversation",
    titleAuto: thread.titleAuto,
    updatedAt: thread.updatedAt,
    messages: [],
  };
}

export function formatCreateThreadLabel(thread: CreateThread) {
  if (thread.title.trim()) {
    return thread.title;
  }
  return deriveThreadTitleFromMessage("");
}
