import type { ApiApp } from "../../global/http/create-app.js";
import { getWorkspaceUsageController } from "./controllers/workspace-usage.controller.js";
import { getWorkspaceUsageRoute } from "./routes/workspace-usage.route.js";

export function registerUsageFeature(app: ApiApp) {
  app.openapi(getWorkspaceUsageRoute, getWorkspaceUsageController);
}
