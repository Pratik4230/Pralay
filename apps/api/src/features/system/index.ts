import type { ApiApp } from "../../global/http/create-app.js";
import { healthController } from "./controllers/health.controller.js";
import { healthRoute } from "./routes/health.route.js";

export function registerSystemFeature(app: ApiApp) {
  app.openapi(healthRoute, healthController);
}
