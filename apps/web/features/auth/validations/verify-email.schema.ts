import { z } from "zod";

import { otpSchema } from "@/features/auth/validations/otp.schema";

export const verifyEmailSchema = z.object({
  otp: otpSchema,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
