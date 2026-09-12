import { z } from "zod";

/** Standard API error body (used by Hono HTTPException + OpenAPI). */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "HTTP_ERROR"
  | "INTERNAL_ERROR";

export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export const unauthorizedError = createApiError(
  "UNAUTHORIZED",
  "Authentication required",
);

export const forbiddenError = createApiError(
  "FORBIDDEN",
  "You do not have permission to perform this action",
);

export const internalError = createApiError(
  "INTERNAL_ERROR",
  "Internal server error",
);

export function validationError(details?: Record<string, unknown>) {
  return createApiError(
    "VALIDATION_ERROR",
    "Request validation failed",
    details,
  );
}

export function httpError(message: string) {
  return createApiError("HTTP_ERROR", message);
}
