import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectGenerationController,
  getProjectGenerationController,
  getProjectGenerationHistoryController,
  getProjectGenerationRealtimeTokenController,
  retryProjectGenerationController,
} from "./controllers/project-generations.controller.js";
import {
  createProjectGenerationRoute,
  getProjectGenerationRoute,
  getProjectGenerationHistoryRoute,
  getProjectGenerationRealtimeTokenRoute,
  retryProjectGenerationRoute,
} from "./routes/project-generations.route.js";

export function registerGenerationsFeature(app: ApiApp) {
  app.openapi(createProjectGenerationRoute, createProjectGenerationController);
  app.openapi(getProjectGenerationRoute, getProjectGenerationController);
  app.openapi(
    getProjectGenerationRealtimeTokenRoute,
    getProjectGenerationRealtimeTokenController,
  );
  app.openapi(
    getProjectGenerationHistoryRoute,
    getProjectGenerationHistoryController,
  );
  app.openapi(retryProjectGenerationRoute, retryProjectGenerationController);
}
