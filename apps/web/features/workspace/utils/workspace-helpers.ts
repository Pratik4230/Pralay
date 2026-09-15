export function getWorkspaceInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "WS";
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }

  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

export function canManageWorkspace(role: "owner" | "admin" | "member") {
  return role === "owner" || role === "admin";
}

export function formatRoleLabel(role: "owner" | "admin" | "member") {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
