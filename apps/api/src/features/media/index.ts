import type { ApiApp } from "../../global/http/create-app.js";
import { getMediaController } from "./controllers/media.controller.js";
import { getMediaRoute } from "./routes/media.route.js";

export function registerMediaFeature(app: ApiApp) {
  app.openapi(getMediaRoute, getMediaController);
}
