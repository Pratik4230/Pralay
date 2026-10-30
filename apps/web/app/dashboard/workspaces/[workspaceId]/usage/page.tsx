import { WorkspaceUsagePage } from "@/features/workspace/pages/workspace-usage-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <WorkspaceUsagePage workspaceId={workspaceId} />;
}
