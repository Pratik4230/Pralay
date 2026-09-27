"use client";

import { create } from "zustand";

import type {
  CreateAttachedAsset,
  CreateChatModelId,
  CreateGenerationUiStatus,
  CreateSessionState,
  CreateThread,
  CreateThreadMessage,
} from "@/features/create/types/create-ui";
import { deriveThreadTitleFromMessage } from "@/features/create/utils/create-thread-title";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptyThread(): CreateThread {
  const id = createId();
  return {
    id,
    title: "New conversation",
    titleAuto: true,
    updatedAt: nowIso(),
    messages: [],
  };
}

export const DEFAULT_SESSION: CreateSessionState = {
  draft: "",
  chatModelId: "gpt-5.4-mini",
  referenceAssetIds: [],
};

type ProjectCreateSlice = {
  threads: CreateThread[];
  activeThreadId: string | null;
  session: CreateSessionState;
  stagedAssets: CreateAttachedAsset[];
  isRunning: boolean;
};

function defaultProjectSlice(): ProjectCreateSlice {
  const thread = createEmptyThread();
  return {
    threads: [thread],
    activeThreadId: thread.id,
    session: { ...DEFAULT_SESSION },
    stagedAssets: [],
    isRunning: false,
  };
}

type CreateProjectStoreState = {
  hasHydrated: boolean;
  byProject: Record<string, ProjectCreateSlice>;
  setHasHydrated: (value: boolean) => void;
  ensureProject: (projectId: string) => void;
  getSlice: (projectId: string) => ProjectCreateSlice;
  setDraft: (projectId: string, draft: string) => void;
  setStagedAssets: (
    projectId: string,
    updater: (current: CreateAttachedAsset[]) => CreateAttachedAsset[],
  ) => void;
  clearStagedAssets: (projectId: string) => void;
  createThread: (projectId: string) => string;
  selectThread: (projectId: string, threadId: string) => void;
  setChatModel: (projectId: string, chatModelId: CreateChatModelId) => void;
  toggleReferenceAsset: (projectId: string, assetId: string) => void;
  submitUserMessage: (
    projectId: string,
    input: {
      text: string;
      libraryAssets: CreateAttachedAsset[];
    },
  ) => void;
  setIsRunning: (projectId: string, isRunning: boolean) => void;
};

export const useCreateProjectStore = create<CreateProjectStoreState>()(
  (set, get) => ({
      hasHydrated: false,
      byProject: {},

      setHasHydrated: (value) => set({ hasHydrated: value }),

      ensureProject: (projectId) => {
        if (get().byProject[projectId]) {
          if (!get().hasHydrated) {
            set({ hasHydrated: true });
          }
          return;
        }
        set((state) => ({
          hasHydrated: true,
          byProject: {
            ...state.byProject,
            [projectId]: defaultProjectSlice(),
          },
        }));
      },

      getSlice: (projectId) => {
        get().ensureProject(projectId);
        return get().byProject[projectId] ?? defaultProjectSlice();
      },

      setDraft: (projectId, draft) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...slice,
                session: { ...slice.session, draft },
              },
            },
          };
        });
      },

      setStagedAssets: (projectId, updater) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...slice,
                stagedAssets: updater(slice.stagedAssets),
              },
            },
          };
        });
      },

      clearStagedAssets: (projectId) => {
        get().setStagedAssets(projectId, () => []);
      },

      createThread: (projectId) => {
        const thread = createEmptyThread();
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...slice,
                threads: [thread, ...slice.threads],
                activeThreadId: thread.id,
              },
            },
          };
        });
        return thread.id;
      },

      selectThread: (projectId, threadId) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: { ...slice, activeThreadId: threadId },
            },
          };
        });
      },

      setChatModel: (projectId, chatModelId) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...slice,
                session: { ...slice.session, chatModelId },
              },
            },
          };
        });
      },

      toggleReferenceAsset: (projectId, assetId) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          const exists = slice.session.referenceAssetIds.includes(assetId);
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...slice,
                session: {
                  ...slice.session,
                  referenceAssetIds: exists
                    ? slice.session.referenceAssetIds.filter((id) => id !== assetId)
                    : [...slice.session.referenceAssetIds, assetId],
                },
              },
            },
          };
        });
      },

      setIsRunning: (projectId, isRunning) => {
        get().ensureProject(projectId);
        set((state) => {
          const slice = state.byProject[projectId] ?? defaultProjectSlice();
          return {
            byProject: {
              ...state.byProject,
              [projectId]: { ...slice, isRunning },
            },
          };
        });
      },

      submitUserMessage: (projectId, input) => {
        const slice = get().getSlice(projectId);
        const activeThreadId = slice.activeThreadId;
        if (!activeThreadId) return;

        const attachments = input.libraryAssets;
        const trimmed = input.text.trim();
        if (!trimmed && attachments.length === 0) return;

        const userText =
          trimmed || "Generate using the attached reference images.";

        const appendMessage = (
          message: Omit<CreateThreadMessage, "id" | "createdAt">,
        ) => {
          const entry: CreateThreadMessage = {
            ...message,
            id: createId(),
            createdAt: nowIso(),
          };

          set((state) => {
            const current = state.byProject[projectId] ?? defaultProjectSlice();
            return {
              byProject: {
                ...state.byProject,
                [projectId]: {
                  ...current,
                  threads: current.threads.map((thread) => {
                    if (thread.id !== activeThreadId) return thread;

                    let title = thread.title;
                    let titleAuto = thread.titleAuto;

                    if (
                      message.role === "user" &&
                      thread.titleAuto &&
                      message.content.trim()
                    ) {
                      title = deriveThreadTitleFromMessage(message.content);
                      titleAuto = true;
                    }

                    return {
                      ...thread,
                      title,
                      titleAuto,
                      messages: [...thread.messages, entry],
                      updatedAt: nowIso(),
                    };
                  }),
                },
              },
            };
          });

          return entry.id;
        };

        const patchGenerationStatus = (
          generationId: string,
          status: CreateGenerationUiStatus,
        ) => {
          set((state) => {
            const current = state.byProject[projectId] ?? defaultProjectSlice();
            return {
              byProject: {
                ...state.byProject,
                [projectId]: {
                  ...current,
                  threads: current.threads.map((thread) => {
                    if (thread.id !== activeThreadId) return thread;
                    return {
                      ...thread,
                      messages: thread.messages.map((message) => {
                        if (message.generation?.id !== generationId)
                          return message;
                        return {
                          ...message,
                          generation: { ...message.generation, status },
                        };
                      }),
                      updatedAt: nowIso(),
                    };
                  }),
                },
              },
            };
          });
        };

        appendMessage({
          role: "user",
          content: userText,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        const generationId = createId();
        const referenceNames = attachments.map((asset) => asset.name);

        appendMessage({
          role: "assistant",
          content:
            "Working on your request (UI preview). Results will appear here when generation is connected.",
          generation: {
            id: generationId,
            status: "queued",
            prompt: userText,
            referenceNames,
          },
        });

        get().setIsRunning(projectId, true);

        window.setTimeout(() => {
          patchGenerationStatus(generationId, "processing");
        }, 900);

        window.setTimeout(() => {
          patchGenerationStatus(generationId, "completed");
          appendMessage({
            role: "assistant",
            content:
              "Preview complete. Image output will show in this thread once the generation pipeline is wired.",
          });
          get().setIsRunning(projectId, false);
        }, 2800);
      },
    }),
);
