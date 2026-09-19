import type { ApiApp } from "../../global/http/create-app.js";
import {
  listGlobalTrashController,
  listProjectTrashController,
  listWorkspaceTrashController,
  permanentlyDeleteGlobalWorkspaceController,
  permanentlyDeleteProjectTrashItemController,
  permanentlyDeleteWorkspaceItemController,
  restoreGlobalTrashWorkspaceController,
  restoreProjectTrashItemController,
  restoreWorkspaceItemController,
} from "./controllers/trash.controller.js";
import {
  listGlobalTrashRoute,
  listProjectTrashRoute,
  listWorkspaceTrashRoute,
  permanentlyDeleteGlobalWorkspaceRoute,
  permanentlyDeleteProjectTrashItemRoute,
  permanentlyDeleteWorkspaceItemRoute,
  restoreGlobalTrashWorkspaceRoute,
  restoreProjectTrashItemRoute,
  restoreWorkspaceItemRoute,
} from "./routes/trash.route.js";
import { startTrashAutoPurgeScheduler } from "./services/trash-purge.service.js";

export function registerTrashFeature(app: ApiApp) {
  // Global Trash
  app.openapi(listGlobalTrashRoute, listGlobalTrashController);
  app.openapi(restoreGlobalTrashWorkspaceRoute, restoreGlobalTrashWorkspaceController);
  app.openapi(permanentlyDeleteGlobalWorkspaceRoute, permanentlyDeleteGlobalWorkspaceController);

  // Workspace Trash
  app.openapi(listWorkspaceTrashRoute, listWorkspaceTrashController);
  app.openapi(restoreWorkspaceItemRoute, restoreWorkspaceItemController);
  app.openapi(permanentlyDeleteWorkspaceItemRoute, permanentlyDeleteWorkspaceItemController);

  // Project Trash
  app.openapi(listProjectTrashRoute, listProjectTrashController);
  app.openapi(restoreProjectTrashItemRoute, restoreProjectTrashItemController);
  app.openapi(permanentlyDeleteProjectTrashItemRoute, permanentlyDeleteProjectTrashItemController);

  // Start background auto-purge timer
  startTrashAutoPurgeScheduler();
}

export * from "./services/trash.service.js";
export * from "./services/trash-purge.service.js";
