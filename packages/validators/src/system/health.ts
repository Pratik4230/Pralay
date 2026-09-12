import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("pralay-api"),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Build a valid health payload at runtime. */
export function createHealthResponse(
  timestamp: Date = new Date(),
): HealthResponse {
  return healthResponseSchema.parse({
    status: "ok",
    service: "pralay-api",
    timestamp: timestamp.toISOString(),
  });
}
