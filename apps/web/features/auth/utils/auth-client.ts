import { createAuthClient } from "better-auth/react";

import { env } from "@/global/utils/env";

export const authClient = createAuthClient({
  baseURL: env.appUrl,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut } = authClient;
