import { headers } from "next/headers";

import { env } from "@/global/utils/env";

export async function fetchApiServer<T>(path: string): Promise<T> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(`${env.appUrl}${path}`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? response.statusText);
  }

  return response.json() as Promise<T>;
}
