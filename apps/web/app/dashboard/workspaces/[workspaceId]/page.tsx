import { WorkspaceDetailPage } from "@/features/workspace/pages/workspace-detail-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceDetailPage workspaceId={workspaceId} />;
}
