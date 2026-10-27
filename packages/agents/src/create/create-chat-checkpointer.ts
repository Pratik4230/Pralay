import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { getDatabaseUrl } from "@repo/env";

let saver: PostgresSaver | undefined;
let setupPromise: Promise<void> | undefined;

export function getCreateChatCheckpointer(): PostgresSaver {
  saver ??= PostgresSaver.fromConnString(getDatabaseUrl());
  return saver;
}

/** Run once during deployment before serving graph traffic. */
export function setupCreateChatCheckpointer(): Promise<void> {
  setupPromise ??= getCreateChatCheckpointer().setup();
  return setupPromise;
}

export async function deleteCreateChatCheckpoints(threadId: string) {
  await getCreateChatCheckpointer().deleteThread(threadId);
}
