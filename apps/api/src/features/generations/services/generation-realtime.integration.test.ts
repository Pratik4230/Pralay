import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "@repo/db";
import {
  generationEvents,
  generations,
  projects,
  workspaces,
} from "@repo/db/schema";

import {
  getGenerationForRealtime,
  markGenerationProcessing,
} from "./project-generations.service.js";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const createdWorkspaceIds: string[] = [];

describe.skipIf(!hasDatabaseUrl)("generation realtime state", () => {
  afterEach(async () => {
    for (const workspaceId of createdWorkspaceIds.splice(0)) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
  });

  test("persists processing state before it is published", async () => {
    const suffix = randomUUID();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Realtime test", slug: `realtime-${suffix}` })
      .returning({ id: workspaces.id });
    createdWorkspaceIds.push(workspace!.id);
    const [project] = await db
      .insert(projects)
      .values({
        workspaceId: workspace!.id,
        name: "Realtime project",
        slug: `realtime-project-${suffix}`,
        createdBy: `realtime-user-${suffix}`,
      })
      .returning({ id: projects.id });
    const [generation] = await db
      .insert(generations)
      .values({
        workspaceId: workspace!.id,
        projectId: project!.id,
        createdBy: `realtime-user-${suffix}`,
        type: "generate",
        prompt: "Realtime integration test image",
      })
      .returning({ id: generations.id });

    const processing = await markGenerationProcessing(generation!.id, 2);
    const reconciled = await getGenerationForRealtime(generation!.id);

    expect(processing).toMatchObject({
      id: generation!.id,
      status: "processing",
      retryCount: 2,
    });
    expect(reconciled).toEqual(processing);
    const events = await db
      .select()
      .from(generationEvents)
      .where(eq(generationEvents.generationId, generation!.id));
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("processing");
  });
});
