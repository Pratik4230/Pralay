import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@repo/db";
import * as schema from "@repo/db/schema";
import { getEmailSender } from "@repo/email";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { bearer, emailOTP } from "better-auth/plugins";

import { authEnv, getSocialProviders } from "./env.js";
import { provisionNewUser } from "./provision-user.js";

const otpSubjects: Record<string, string> = {
  "sign-in": "Your Pralay sign-in code",
  "email-verification": "Verify your Pralay email",
  "forget-password": "Reset your Pralay password",
  "change-email": "Confirm your new Pralay email",
};

function getOtpSubject(type: string) {
  return otpSubjects[type] ?? "Your Pralay verification code";
}

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
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: getSocialProviders() as BetterAuthOptions["socialProviders"],
  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        void getEmailSender()({
          to: email,
          subject: getOtpSubject(type),
          text: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes.`,
        });
      },
    }),
  ],
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
