import { inngest } from "../client.js";

/** Smoke-test function for local Inngest Dev Server wiring. */
export const inngestHealthCheck = inngest.createFunction(
  { id: "health-check", triggers: [{ event: "pralay/inngest.health" }] },
  async ({ step }) => {
    const result = await step.run("ping", () => ({ ok: true as const }));
    return result;
  },
);
