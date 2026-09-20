import type { ApiApp } from "../../global/http/create-app.js";
import {
  acceptWorkspaceInviteController,
  createWorkspaceInviteController,
  listWorkspaceInvitesController,
  revokeWorkspaceInviteController,
} from "./controllers/workspace-invites.controller.js";
import {
  deleteWorkspaceMemberController,
  listWorkspaceMembersController,
  updateWorkspaceMemberController,
} from "./controllers/workspace-members.controller.js";
import {
  createWorkspaceController,
  deleteWorkspaceController,
  getWorkspaceController,
  listWorkspacesController,
  updateWorkspaceController,
} from "./controllers/workspaces.controller.js";
import { createWorkspaceAvatarUploadController } from "./controllers/workspace-avatar.controller.js";
import { createWorkspaceCoverUploadController } from "./controllers/workspace-cover.controller.js";
import {
  acceptWorkspaceInviteRoute,
  createWorkspaceInviteRoute,
  listWorkspaceInvitesRoute,
  revokeWorkspaceInviteRoute,
} from "./routes/workspace-invites.route.js";
import {
  deleteWorkspaceMemberRoute,
  listWorkspaceMembersRoute,
  updateWorkspaceMemberRoute,
} from "./routes/workspace-members.route.js";
import {
  createWorkspaceRoute,
  createWorkspaceAvatarUploadRoute,
  createWorkspaceCoverUploadRoute,
  deleteWorkspaceRoute,
  getWorkspaceRoute,
  listWorkspacesRoute,
  updateWorkspaceRoute,
} from "./routes/workspaces.route.js";

export function registerWorkspaceFeature(app: ApiApp) {
  app.openapi(listWorkspacesRoute, listWorkspacesController);
  app.openapi(createWorkspaceRoute, createWorkspaceController);
  app.openapi(getWorkspaceRoute, getWorkspaceController);
  app.openapi(updateWorkspaceRoute, updateWorkspaceController);
  app.openapi(deleteWorkspaceRoute, deleteWorkspaceController);
  app.openapi(
    createWorkspaceAvatarUploadRoute,
    createWorkspaceAvatarUploadController,
  );
  app.openapi(
    createWorkspaceCoverUploadRoute,
    createWorkspaceCoverUploadController,
  );

  app.openapi(listWorkspaceMembersRoute, listWorkspaceMembersController);
  app.openapi(updateWorkspaceMemberRoute, updateWorkspaceMemberController);
  app.openapi(deleteWorkspaceMemberRoute, deleteWorkspaceMemberController);

  app.openapi(listWorkspaceInvitesRoute, listWorkspaceInvitesController);
  app.openapi(createWorkspaceInviteRoute, createWorkspaceInviteController);
  app.openapi(revokeWorkspaceInviteRoute, revokeWorkspaceInviteController);
  app.openapi(acceptWorkspaceInviteRoute, acceptWorkspaceInviteController);
}
