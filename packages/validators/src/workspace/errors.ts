import { createApiError } from "../common/api-error.js";

export const workspaceNotFoundError = createApiError(
  "NOT_FOUND",
  "Workspace not found",
);

export const workspaceSlugTakenError = createApiError(
  "CONFLICT",
  "Workspace slug is already taken",
);

export const memberNotFoundError = createApiError(
  "NOT_FOUND",
  "Member not found",
);

export const inviteNotFoundError = createApiError(
  "NOT_FOUND",
  "Invite not found",
);

export const inviteConflictError = createApiError(
  "CONFLICT",
  "An active invite already exists for this email",
);

export const memberConflictError = createApiError(
  "CONFLICT",
  "User is already a member of this workspace",
);

export const inviteInvalidError = createApiError(
  "BAD_REQUEST",
  "Invite is invalid or expired",
);
