import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { auth } from "@repo/auth";
import { db } from "@repo/db";
import {
  apiErrorSchema,
  createHealthResponse,
  healthResponseSchema,
  meResponseSchema,
} from "@repo/validators";

import { sessionMiddleware, type AuthVariables } from "./middleware/session.js";
import { meRoute } from "./routes/me.js";

const app = new OpenAPIHono<{ Variables: AuthVariables }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: result.error.flatten(),
          },
        },
        422,
      );
    }
  },
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: "HTTP_ERROR",
          message: err.message,
        },
      },
      err.status,
    );
  }

  console.error(err);

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
});

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  description: "Returns API status and verifies database connectivity.",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
    503: {
      description: "Service unavailable",
      content: {
        "application/json": {
          schema: apiErrorSchema,
        },
      },
    },
  },
});

app.openapi(healthRoute, async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    console.error("Database health check failed:", error);
    throw new HTTPException(503, { message: "Database unavailable" });
  }

  return c.json(createHealthResponse(), 200);
});

app.use("/api/v1/*", sessionMiddleware);

app.openapi(meRoute, (c) => {
  const session = c.get("session");

  if (!session) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      },
      401,
    );
  }

  const payload = meResponseSchema.parse({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      image: session.user.image ?? null,
      createdAt: new Date(session.user.createdAt).toISOString(),
      updatedAt: new Date(session.user.updatedAt).toISOString(),
    },
    session: {
      id: session.session.id,
      expiresAt: new Date(session.session.expiresAt).toISOString(),
      token: session.session.token,
      createdAt: new Date(session.session.createdAt).toISOString(),
      updatedAt: new Date(session.session.updatedAt).toISOString(),
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
      userId: session.session.userId,
    },
  });

  return c.json(payload, 200);
});

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Pralay API",
    version: "0.1.0",
    description: "Pralay creative platform API",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Local development",
    },
  ],
});

app.get("/docs", swaggerUI({ url: "/openapi.json" }));

export { app };
