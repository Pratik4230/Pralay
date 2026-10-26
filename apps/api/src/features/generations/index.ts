import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectGenerationController,
  getProjectGenerationController,
  retryProjectGenerationController,
} from "./controllers/project-generations.controller.js";
import {
  createProjectGenerationRoute,
  getProjectGenerationRoute,
  retryProjectGenerationRoute,
} from "./routes/project-generations.route.js";

export function registerGenerationsFeature(app: ApiApp) {
  app.openapi(createProjectGenerationRoute, createProjectGenerationController);
  app.openapi(getProjectGenerationRoute, getProjectGenerationController);
  app.openapi(retryProjectGenerationRoute, retryProjectGenerationController);
}
