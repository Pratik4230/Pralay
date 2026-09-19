export const workspaceKeys = {
  all: ["workspaces"] as const,
  infiniteList: (limit: number) =>
    ["workspaces", "infinite", limit] as const,
  detail: (id: string) => ["workspaces", id] as const,
  members: (workspaceId: string) =>
    ["workspaces", workspaceId, "members"] as const,
  invites: (workspaceId: string) =>
    ["workspaces", workspaceId, "invites"] as const,
  assets: (workspaceId: string) =>
    ["workspaces", workspaceId, "assets"] as const,
  assetsInfinite: (workspaceId: string, limit: number) =>
    ["workspaces", workspaceId, "assets", "infinite", limit] as const,
  projects: (workspaceId: string) =>
    ["workspaces", workspaceId, "projects"] as const,
  project: (workspaceId: string, projectId: string) =>
    ["workspaces", workspaceId, "projects", projectId] as const,
  trash: (workspaceId: string) =>
    ["workspaces", workspaceId, "trash"] as const,
  projectTrash: (workspaceId: string, projectId: string) =>
    ["workspaces", workspaceId, "projects", projectId, "trash"] as const,
};

export const meKeys = {
  current: ["me"] as const,
};

export const globalTrashKeys = {
  workspaces: ["trash", "workspaces"] as const,
};
