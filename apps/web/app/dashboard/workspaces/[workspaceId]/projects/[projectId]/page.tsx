import { ProjectDetailPage } from "@/features/workspace/pages/project-detail-page";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  return <ProjectDetailPage workspaceId={workspaceId} projectId={projectId} />;
}
