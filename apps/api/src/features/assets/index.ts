import type { ApiApp } from "../../global/http/create-app.js";
import {
  bulkDeleteWorkspaceAssetsController,
  createWorkspaceAssetController,
  createWorkspaceAssetUploadController,
  deleteWorkspaceAssetController,
  listWorkspaceAssetsController,
  updateWorkspaceAssetController,
} from "./controllers/workspace-assets.controller.js";
import {
  bulkDeleteWorkspaceAssetsRoute,
  createWorkspaceAssetRoute,
  createWorkspaceAssetUploadRoute,
  deleteWorkspaceAssetRoute,
  listWorkspaceAssetsRoute,
  updateWorkspaceAssetRoute,
} from "./routes/workspace-assets.route.js";

export function registerAssetsFeature(app: ApiApp) {
  app.openapi(listWorkspaceAssetsRoute, listWorkspaceAssetsController);
  app.openapi(createWorkspaceAssetUploadRoute, createWorkspaceAssetUploadController);
  app.openapi(createWorkspaceAssetRoute, createWorkspaceAssetController);
  app.openapi(deleteWorkspaceAssetRoute, deleteWorkspaceAssetController);
  app.openapi(bulkDeleteWorkspaceAssetsRoute, bulkDeleteWorkspaceAssetsController);
  app.openapi(updateWorkspaceAssetRoute, updateWorkspaceAssetController);
}

