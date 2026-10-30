import type { ApiApp } from "../../global/http/create-app.js";
import {
  getWorkspaceUsageController,
  updateWorkspaceUsageBudgetController,
} from "./controllers/workspace-usage.controller.js";
import {
  getWorkspaceUsageRoute,
  updateWorkspaceUsageBudgetRoute,
} from "./routes/workspace-usage.route.js";
import {
  adjustWorkspaceCreditsController,
  updateProjectAiBudgetController,
} from "./controllers/ai-usage-admin.controller.js";
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "./controllers/notifications.controller.js";
import {
  adjustWorkspaceCreditsRoute,
  updateProjectAiBudgetRoute,
} from "./routes/ai-usage-admin.route.js";
import {
  listNotificationsRoute,
  markAllNotificationsReadRoute,
  markNotificationReadRoute,
} from "./routes/notifications.route.js";

export function registerUsageFeature(app: ApiApp) {
  app.openapi(getWorkspaceUsageRoute, getWorkspaceUsageController);
  app.openapi(
    updateWorkspaceUsageBudgetRoute,
    updateWorkspaceUsageBudgetController,
  );
  app.openapi(updateProjectAiBudgetRoute, updateProjectAiBudgetController);
  app.openapi(adjustWorkspaceCreditsRoute, adjustWorkspaceCreditsController);
  app.openapi(listNotificationsRoute, listNotificationsController);
  app.openapi(markNotificationReadRoute, markNotificationReadController);
  app.openapi(
    markAllNotificationsReadRoute,
    markAllNotificationsReadController,
  );
}
