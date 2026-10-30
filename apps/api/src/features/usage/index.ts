import type { ApiApp } from "../../global/http/create-app.js";
import {
  getWorkspaceUsageController,
  updateWorkspaceUsageBudgetController,
} from "./controllers/workspace-usage.controller.js";
import {
  getWorkspaceUsageRoute,
  updateWorkspaceUsageBudgetRoute,
} from "./routes/workspace-usage.route.js";

export function registerUsageFeature(app: ApiApp) {
  app.openapi(getWorkspaceUsageRoute, getWorkspaceUsageController);
  app.openapi(
    updateWorkspaceUsageBudgetRoute,
    updateWorkspaceUsageBudgetController,
  );
}
