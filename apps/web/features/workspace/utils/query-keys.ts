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
};

export const meKeys = {
  current: ["me"] as const,
};
