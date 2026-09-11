import { randomBytes } from "node:crypto";

import { db } from "@repo/db";
import {
  collections,
  userWorkspacePreferences,
  workspaceMembers,
  workspaces,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";

type NewUser = {
  id: string;
  name: string;
  email: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "workspace";
  let attempt = 0;

  while (attempt < 10) {
    const candidate = attempt === 0 ? slug : `${slug}-${randomBytes(3).toString("hex")}`;
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    attempt += 1;
  }

  return `${slug}-${randomBytes(4).toString("hex")}`;
}

/** Creates default workspace, owner membership, preferences, and My Library collection. */
export async function provisionNewUser(user: NewUser): Promise<void> {
  const [existingMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  if (existingMember) {
    return;
  }

  const emailLocalPart = user.email.split("@")[0] ?? user.name;
  const slug = await createUniqueSlug(emailLocalPart);
  const workspaceName =
    user.name.trim().length > 0 ? `${user.name}'s Workspace` : "My Workspace";

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug,
      })
      .returning({ id: workspaces.id });

    if (!workspace) {
      throw new Error("Failed to create default workspace");
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    await tx.insert(userWorkspacePreferences).values({
      userId: user.id,
      workspaceId: workspace.id,
    });

    await tx.insert(collections).values({
      scope: "user",
      userId: user.id,
      name: "My Library",
      isDefault: true,
      createdBy: user.id,
    });
  });
}
