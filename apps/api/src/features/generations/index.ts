import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectGenerationController,
  getProjectGenerationController,
  getProjectGenerationHistoryController,
  retryProjectGenerationController,
} from "./controllers/project-generations.controller.js";
import {
  createProjectGenerationRoute,
  getProjectGenerationRoute,
  getProjectGenerationHistoryRoute,
  retryProjectGenerationRoute,
} from "./routes/project-generations.route.js";

export function registerGenerationsFeature(app: ApiApp) {
  app.openapi(createProjectGenerationRoute, createProjectGenerationController);
  app.openapi(getProjectGenerationRoute, getProjectGenerationController);
  app.openapi(
    getProjectGenerationHistoryRoute,
    getProjectGenerationHistoryController,
  );
  app.openapi(retryProjectGenerationRoute, retryProjectGenerationController);
}
