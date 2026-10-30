import { inngest } from "../client.js";
import {
  createAiUsageAlertNotifications,
  scanAiUsageAlerts,
  sendAiUsageAlertEmail,
  type AiUsageAlert,
} from "../../features/usage/services/ai-usage-alerts.service.js";

export const monitorAiUsage = inngest.createFunction(
  {
    id: "monitor-ai-usage",
    triggers: [{ cron: "*/15 * * * *" }],
    retries: 3,
    concurrency: 1,
  },
  async ({ step }) => {
    const alerts = await step.run("scan-ai-usage-alerts", scanAiUsageAlerts);
    if (alerts.length === 0) return { alerts: 0 };

    await step.sendEvent(
      "dispatch-ai-usage-alerts",
      alerts.map((alert) => ({
        id: alert.dedupeKey,
        name: "pralay/ai-usage.alerted" as const,
        data: alert,
      })),
    );
    return { alerts: alerts.length };
  },
);

export const deliverAiUsageAlert = inngest.createFunction(
  {
    id: "deliver-ai-usage-alert",
    triggers: [{ event: "pralay/ai-usage.alerted" }],
    idempotency: "event.data.dedupeKey",
    retries: 4,
    concurrency: 10,
  },
  async ({ event, step }) => {
    const alert = event.data as AiUsageAlert;
    const recipients = await step.run("create-deduplicated-notifications", () =>
      createAiUsageAlertNotifications(alert),
    );

    for (const recipient of recipients) {
      await step.run(`send-ai-usage-alert-email-${recipient.id}`, () =>
        sendAiUsageAlertEmail(recipient, alert),
      );
    }
    return { delivered: recipients.length };
  },
);
