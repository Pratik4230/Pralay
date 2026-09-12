import { z } from "zod";

import { otpSchema } from "@/features/auth/validations/otp.schema";

export const resetPasswordSchema = z
  .object({
    otp: otpSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
