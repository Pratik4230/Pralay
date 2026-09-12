import { OpenAPIHono } from "@hono/zod-openapi";

import type { AuthVariables } from "../middleware/session.js";
import { onAppError, validationErrorHook } from "./errors.js";

export type ApiApp = OpenAPIHono<{ Variables: AuthVariables }>;

export function createApp(): ApiApp {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationErrorHook,
  });

  app.onError(onAppError);

  return app;
}
