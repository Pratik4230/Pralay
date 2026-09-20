import { ProjectAssetsPage } from "@/features/workspace/pages/project-assets-page";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  return <ProjectAssetsPage workspaceId={workspaceId} projectId={projectId} />;
}
