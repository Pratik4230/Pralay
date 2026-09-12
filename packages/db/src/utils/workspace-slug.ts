import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../client.js";
import { workspaces } from "../schema/workspaces.js";

export function slugifyWorkspaceName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createUniqueWorkspaceSlug(base: string): Promise<string> {
  let slug = slugifyWorkspaceName(base) || "workspace";
  let attempt = 0;

  while (attempt < 10) {
    const candidate =
      attempt === 0 ? slug : `${slug}-${randomBytes(3).toString("hex")}`;
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

export async function isWorkspaceSlugTaken(slug: string): Promise<boolean> {
  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  return existing.length > 0;
}
