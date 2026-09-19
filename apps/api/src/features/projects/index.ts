import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectCoverUploadController,
  createWorkspaceProjectController,
  deleteWorkspaceProjectController,
  getWorkspaceProjectController,
  listWorkspaceProjectsController,
  updateWorkspaceProjectController,
} from "./controllers/workspace-projects.controller.js";
import {
  createProjectCoverUploadRoute,
  createWorkspaceProjectRoute,
  deleteWorkspaceProjectRoute,
  getWorkspaceProjectRoute,
  listWorkspaceProjectsRoute,
  updateWorkspaceProjectRoute,
} from "./routes/workspace-projects.route.js";

export function registerProjectsFeature(app: ApiApp) {
  app.openapi(listWorkspaceProjectsRoute, listWorkspaceProjectsController);
  app.openapi(createWorkspaceProjectRoute, createWorkspaceProjectController);
  app.openapi(getWorkspaceProjectRoute, getWorkspaceProjectController);
  app.openapi(updateWorkspaceProjectRoute, updateWorkspaceProjectController);
  app.openapi(deleteWorkspaceProjectRoute, deleteWorkspaceProjectController);
  app.openapi(
    createProjectCoverUploadRoute,
    createProjectCoverUploadController,
  );
}
