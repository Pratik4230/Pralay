import { redirect } from "next/navigation";

import type { WorkspaceResponse } from "@/features/workspace/types";
import { fetchApiServer } from "@/global/utils/api-server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  try {
    await fetchApiServer<WorkspaceResponse>(`/api/v1/workspaces/${workspaceId}`);
  } catch {
    redirect("/dashboard");
  }

  return children;
}
