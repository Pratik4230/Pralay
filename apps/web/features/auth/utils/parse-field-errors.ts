import type { ZodError } from "zod";

export function parseFieldErrors<T extends string>(
  error: ZodError,
  keys: readonly T[],
): Partial<Record<T, string>> {
  const fieldErrors: Partial<Record<T, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && keys.includes(key as T)) {
      fieldErrors[key as T] = issue.message;
    }
  }

  return fieldErrors;
}
