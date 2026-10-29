"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CreateGenerationBlock } from "@/features/create/types/create-ui";

type GenerationOutputAsset = NonNullable<
  CreateGenerationBlock["outputAssets"]
>[number];

type CreateGenerationsContextValue = {
  workspaceId: string;
  projectId: string;
  byMessageId: Map<string, CreateGenerationBlock>;
  submitImageEdit: (
    asset: GenerationOutputAsset,
    instruction: string,
    onAccepted: () => void,
  ) => Promise<void>;
  submitImageResize: (
    asset: GenerationOutputAsset,
    width: number,
    height: number,
    onAccepted: () => void,
  ) => Promise<void>;
};

const CreateGenerationsContext =
  createContext<CreateGenerationsContextValue | null>(null);

export function CreateGenerationsProvider({
  workspaceId,
  projectId,
  byMessageId,
  submitImageEdit,
  submitImageResize,
  children,
}: {
  workspaceId: string;
  projectId: string;
  byMessageId: Map<string, CreateGenerationBlock>;
  submitImageEdit: CreateGenerationsContextValue["submitImageEdit"];
  submitImageResize: CreateGenerationsContextValue["submitImageResize"];
  children: ReactNode;
}) {
  return (
    <CreateGenerationsContext.Provider
      value={{
        workspaceId,
        projectId,
        byMessageId,
        submitImageEdit,
        submitImageResize,
      }}
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
    submitImageEdit: ctx?.submitImageEdit,
    submitImageResize: ctx?.submitImageResize,
  };
}
