import { headers } from "next/headers";

import { env } from "@/global/utils/env";

type SessionResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
  session: {
    id: string;
    userId: string;
  };
};

export async function getSessionServer() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(`${env.appUrl}/api/auth/get-session`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SessionResponse | null;
  if (!data?.user || !data?.session) {
    return null;
  }

  return data;
}
