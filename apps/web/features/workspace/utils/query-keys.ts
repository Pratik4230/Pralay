export const workspaceKeys = {
  all: ["workspaces"] as const,
  detail: (id: string) => ["workspaces", id] as const,
  members: (workspaceId: string) =>
    ["workspaces", workspaceId, "members"] as const,
  invites: (workspaceId: string) =>
    ["workspaces", workspaceId, "invites"] as const,
};

export const meKeys = {
  current: ["me"] as const,
};
