import { env } from "@/global/utils/env";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
  };
};

function getApiErrorMessage(
  body: ApiErrorBody | null,
  fallback: string,
): string {
  if (!body?.error) {
    return fallback;
  }

  if (body.error.code === "VALIDATION_ERROR" && body.error.details) {
    const { fieldErrors, formErrors } = body.error.details;
    for (const messages of Object.values(fieldErrors ?? {})) {
      const first = messages?.[0];
      if (first) {
        return first;
      }
    }
    const formFirst = formErrors?.[0];
    if (formFirst) {
      return formFirst;
    }
  }

  return body.error.message ?? fallback;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchApiClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${env.appUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      response.status,
      getApiErrorMessage(body, response.statusText),
      body?.error?.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
