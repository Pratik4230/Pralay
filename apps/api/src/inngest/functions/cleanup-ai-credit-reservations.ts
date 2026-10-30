import { releaseExpiredAiCreditReservations } from "@repo/usage";

import { inngest } from "../client.js";

export const cleanupAiCreditReservations = inngest.createFunction(
  {
    id: "cleanup-ai-credit-reservations",
    triggers: [{ cron: "*/10 * * * *" }],
    retries: 3,
    concurrency: 1,
  },
  async ({ step }) =>
    step.run("release-expired-credit-reservations", () =>
      releaseExpiredAiCreditReservations(1_000),
    ),
);
