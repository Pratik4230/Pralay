import { Badge } from "@repo/ui/components/badge";

import type { WorkspaceRole } from "@/features/workspace/types";
import { formatRoleLabel } from "@/features/workspace/utils/workspace-helpers";

type WorkspaceRoleBadgeProps = {
  role: WorkspaceRole;
};

export function WorkspaceRoleBadge({ role }: WorkspaceRoleBadgeProps) {
  const variant =
    role === "owner" ? "default" : role === "admin" ? "secondary" : "outline";

  return <Badge variant={variant}>{formatRoleLabel(role)}</Badge>;
}
