import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

import { env } from "@/global/utils/env";

export const authClient = createAuthClient({
  baseURL: env.appUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut } = authClient;
