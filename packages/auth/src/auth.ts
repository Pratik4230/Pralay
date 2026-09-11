import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@repo/db";
import * as schema from "@repo/db/schema";
import { consoleEmailSender } from "@repo/email";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

import { authEnv, getSocialProviders } from "./env.js";
import { provisionNewUser } from "./provision-user.js";

export const auth = betterAuth({
  appName: "Pralay",
  secret: authEnv.secret,
  baseURL: authEnv.baseURL,
  trustedOrigins: authEnv.trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void consoleEmailSender({
        to: user.email,
        subject: "Reset your Pralay password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void consoleEmailSender({
        to: user.email,
        subject: "Verify your Pralay email",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
  socialProviders: getSocialProviders(),
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionNewUser({
            id: user.id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
