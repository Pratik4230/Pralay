import type { ApiApp } from "../../global/http/create-app.js";
import {
  createWorkspaceAssetController,
  createWorkspaceAssetUploadController,
  deleteWorkspaceAssetController,
  listWorkspaceAssetsController,
} from "./controllers/workspace-assets.controller.js";
import {
  createWorkspaceAssetRoute,
  createWorkspaceAssetUploadRoute,
  deleteWorkspaceAssetRoute,
  listWorkspaceAssetsRoute,
} from "./routes/workspace-assets.route.js";

export function registerAssetsFeature(app: ApiApp) {
  app.openapi(listWorkspaceAssetsRoute, listWorkspaceAssetsController);
  app.openapi(createWorkspaceAssetUploadRoute, createWorkspaceAssetUploadController);
  app.openapi(createWorkspaceAssetRoute, createWorkspaceAssetController);
  app.openapi(deleteWorkspaceAssetRoute, deleteWorkspaceAssetController);
}
