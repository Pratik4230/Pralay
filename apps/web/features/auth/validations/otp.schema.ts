import { z } from "zod";

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export type OtpInput = z.infer<typeof otpSchema>;
