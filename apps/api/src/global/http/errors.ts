import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import {
  createApiError,
  httpError,
  internalError,
  validationError,
} from "@repo/validators";

export function validationErrorHook(
  result: { success: boolean; error?: { flatten: () => unknown } },
  c: Context,
) {
  if (!result.success) {
    const details = result.error?.flatten();

    return c.json(
      validationError(
        typeof details === "object" && details !== null
          ? (details as Record<string, unknown>)
          : undefined,
      ),
      422,
    );
  }
}

export function onAppError(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json(httpError(err.message), err.status);
  }

  console.error(err);

  return c.json(internalError, 500);
}

export { createApiError };
