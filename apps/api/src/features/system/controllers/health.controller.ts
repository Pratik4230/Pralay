import type { RouteHandler } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db } from "@repo/db";
import { createHealthResponse } from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";
import type { healthRoute } from "../routes/health.route.js";

export const healthController: RouteHandler<
  typeof healthRoute,
  { Variables: AuthVariables }
> = async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    console.error("Database health check failed:", error);
    throw new HTTPException(503, { message: "Database unavailable" });
  }

  return c.json(createHealthResponse(), 200);
};
