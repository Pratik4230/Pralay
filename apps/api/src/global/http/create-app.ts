import { OpenAPIHono } from "@hono/zod-openapi";

import {
  corsPreflightMiddleware,
  corsResponseMiddleware,
} from "../middleware/cors.js";
import type { AuthVariables } from "../middleware/session.js";
import { onAppError, validationErrorHook } from "./errors.js";

export type ApiApp = OpenAPIHono<{ Variables: AuthVariables }>;

export function createApp(): ApiApp {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationErrorHook,
  });

  app.use("*", corsPreflightMiddleware);
  app.use("*", corsResponseMiddleware);

  app.onError(onAppError);

  return app;
}
