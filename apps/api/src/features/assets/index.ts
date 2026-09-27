import type { ApiApp } from "../../global/http/create-app.js";
import {
  bulkDeleteWorkspaceAssetsController,
  createWorkspaceAssetController,
  createWorkspaceAssetUploadController,
  deleteWorkspaceAssetController,
  listWorkspaceAssetsController,
  suggestWorkspaceAssetsController,
  updateWorkspaceAssetController,
} from "./controllers/workspace-assets.controller.js";
import {
  bulkDeleteWorkspaceAssetsRoute,
  createWorkspaceAssetRoute,
  createWorkspaceAssetUploadRoute,
  deleteWorkspaceAssetRoute,
  listWorkspaceAssetsRoute,
  suggestWorkspaceAssetsRoute,
  updateWorkspaceAssetRoute,
} from "./routes/workspace-assets.route.js";

export function registerAssetsFeature(app: ApiApp) {
  app.openapi(listWorkspaceAssetsRoute, listWorkspaceAssetsController);
  app.openapi(suggestWorkspaceAssetsRoute, suggestWorkspaceAssetsController);
  app.openapi(createWorkspaceAssetUploadRoute, createWorkspaceAssetUploadController);
  app.openapi(createWorkspaceAssetRoute, createWorkspaceAssetController);
  app.openapi(deleteWorkspaceAssetRoute, deleteWorkspaceAssetController);
  app.openapi(bulkDeleteWorkspaceAssetsRoute, bulkDeleteWorkspaceAssetsController);
  app.openapi(updateWorkspaceAssetRoute, updateWorkspaceAssetController);
}

