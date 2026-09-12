import { z } from "zod";

export const meUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const meSessionSchema = z.object({
  id: z.string(),
  expiresAt: z.iso.datetime(),
  token: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
});

export const meResponseSchema = z.object({
  user: meUserSchema,
  session: meSessionSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;
