export const createKeys = {
  assistantThreads: (workspaceId: string, projectId: string) =>
    ["create", workspaceId, projectId, "assistant", "threads"] as const,
  assistantMessages: (
    workspaceId: string,
    projectId: string,
    threadId: string,
  ) =>
    [
      "create",
      workspaceId,
      projectId,
      "assistant",
      "threads",
      threadId,
      "messages",
    ] as const,
};
