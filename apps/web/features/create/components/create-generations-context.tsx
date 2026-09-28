"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CreateGenerationBlock } from "@/features/create/types/create-ui";

type CreateGenerationsContextValue = {
  workspaceId: string;
  projectId: string;
  byMessageId: Map<string, CreateGenerationBlock>;
};

const CreateGenerationsContext =
  createContext<CreateGenerationsContextValue | null>(null);

export function CreateGenerationsProvider({
  workspaceId,
  projectId,
  byMessageId,
  children,
}: {
  workspaceId: string;
  projectId: string;
  byMessageId: Map<string, CreateGenerationBlock>;
  children: ReactNode;
}) {
  return (
    <CreateGenerationsContext.Provider
      value={{ workspaceId, projectId, byMessageId }}
    >
      {children}
    </CreateGenerationsContext.Provider>
  );
}

export function useCreateMessageGeneration(messageId: string) {
  const ctx = useContext(CreateGenerationsContext);
  if (!ctx) return undefined;
  return ctx.byMessageId.get(messageId);
}

export function useCreateGenerationsScope() {
  const ctx = useContext(CreateGenerationsContext);
  return {
    workspaceId: ctx?.workspaceId ?? "",
    projectId: ctx?.projectId ?? "",
  };
}
