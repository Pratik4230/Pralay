import { channel } from "inngest/realtime";

import {
  assistantRunRealtimeEventSchema,
  generationRealtimeEventSchema,
  notificationRealtimeEventSchema,
} from "@repo/validators";

export const assistantRunChannel = channel({
  name: (runId: string) => `assistant-run:${runId}`,
  topics: {
    event: { schema: assistantRunRealtimeEventSchema },
  },
});

export const generationChannel = channel({
  name: (generationId: string) => `generation:${generationId}`,
  topics: {
    status: { schema: generationRealtimeEventSchema },
  },
});

export const userNotificationsChannel = channel({
  name: (userId: string) => `user-notifications:${userId}`,
  topics: {
    notification: { schema: notificationRealtimeEventSchema },
  },
});
