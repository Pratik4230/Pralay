import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

import { env } from "../../config/env.js";

const corsOptions = {
  origin: env.corsOrigin,
  credentials: true,
} as const;

/** Preflight and initial pass (OPTIONS returns early). */
export const corsPreflightMiddleware = cors(corsOptions);

/**
 * Hono cors sets Allow-Origin on c.res before next(); handlers that replace
 * the response (c.json, new Response(stream)) drop those headers. Re-apply after.
 */
export const corsResponseMiddleware = createMiddleware(async (c, next) => {
  await next();

  const origin = c.req.header("Origin");
  if (!origin || origin !== env.corsOrigin) {
    return;
  }

  c.res.headers.set("Access-Control-Allow-Origin", origin);
  c.res.headers.set("Access-Control-Allow-Credentials", "true");
});
