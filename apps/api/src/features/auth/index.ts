import { auth } from "@repo/auth";

import type { ApiApp } from "../../global/http/create-app.js";
import { meController } from "./controllers/me.controller.js";
import { meRoute } from "./routes/me.route.js";

/** Better Auth handler (login, signup, OTP, etc.). Public routes. */
export function registerAuthHandler(app: ApiApp) {
  app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
}

/** Authenticated auth routes. Register after session middleware. */
export function registerAuthRoutes(app: ApiApp) {
  app.openapi(meRoute, meController);
}
