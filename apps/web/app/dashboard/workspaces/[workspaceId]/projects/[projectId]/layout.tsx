import { redirect } from "next/navigation";

import type { Project } from "@repo/validators";

import { fetchApiServer } from "@/global/utils/api-server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;

  try {
    await fetchApiServer<{ project: Project }>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    );
  } catch {
    redirect(`/dashboard/workspaces/${workspaceId}/projects`);
  }

  return children;
}
