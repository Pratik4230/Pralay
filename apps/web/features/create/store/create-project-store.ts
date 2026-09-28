"use client";

import { create } from "zustand";

import type {
  CreateAttachedAsset,
  CreateChatModelId,
  CreateSessionState,
} from "@/features/create/types/create-ui";

export const DEFAULT_SESSION: CreateSessionState = {
  draft: "",
  chatModelId: "gpt-5.4-mini",
  referenceAssetIds: [],
};

type ProjectCreateSlice = {
  activeThreadId: string | null;
  /** When true, do not auto-select the latest server thread. */
  newChatMode: boolean;
  session: CreateSessionState;
  stagedAssets: CreateAttachedAsset[];
};

function defaultProjectSlice(): ProjectCreateSlice {
  return {
    activeThreadId: null,
    newChatMode: false,
    session: { ...DEFAULT_SESSION },
    stagedAssets: [],
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
  startNewChat: (projectId: string) => void;
  selectThread: (projectId: string, threadId: string) => void;
  setActiveThreadId: (projectId: string, threadId: string) => void;
  setChatModel: (projectId: string, chatModelId: CreateChatModelId) => void;
  toggleReferenceAsset: (projectId: string, assetId: string) => void;
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

    startNewChat: (projectId) => {
      get().ensureProject(projectId);
      set((state) => {
        const slice = state.byProject[projectId] ?? defaultProjectSlice();
        return {
          byProject: {
            ...state.byProject,
            [projectId]: {
              ...slice,
              activeThreadId: null,
              newChatMode: true,
            },
          },
        };
      });
    },

    selectThread: (projectId, threadId) => {
      get().ensureProject(projectId);
      set((state) => {
        const slice = state.byProject[projectId] ?? defaultProjectSlice();
        return {
          byProject: {
            ...state.byProject,
            [projectId]: {
              ...slice,
              activeThreadId: threadId,
              newChatMode: false,
            },
          },
        };
      });
    },

    setActiveThreadId: (projectId, threadId) => {
      get().selectThread(projectId, threadId);
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
  }),
);
