import { createMiddleware } from "hono/factory";

import { auth, type Session } from "@repo/auth";

export type AuthVariables = {
  session: Session | null;
};

export const sessionMiddleware = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  c.set("session", session);
  await next();
});
