import { getSubscriptionToken, type Realtime } from "inngest/realtime";

import { realtimeSubscriptionTokenSchema } from "@repo/validators";

import { inngest } from "./client.js";

export async function createRealtimeSubscriptionToken(
  channel: Realtime.ChannelInstance,
  topics: string[],
) {
  const token = await getSubscriptionToken(inngest, { channel, topics });
  return realtimeSubscriptionTokenSchema.parse({
    key: token.key,
    apiBaseUrl: token.apiBaseUrl,
    channel: channel.name,
    topics,
  });
}
