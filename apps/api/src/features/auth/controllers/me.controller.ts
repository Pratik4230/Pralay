import type { Context } from "hono";

import { meResponseSchema, unauthorizedError } from "@repo/validators";

import type { AuthVariables } from "../../../global/middleware/session.js";

export async function meController(c: Context<{ Variables: AuthVariables }>) {
  const session = c.get("session");

  if (!session) {
    return c.json(unauthorizedError, 401);
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
}
