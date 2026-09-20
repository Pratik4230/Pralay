import { ProjectCreatePage } from "@/features/workspace/pages/project-create-page";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  return <ProjectCreatePage workspaceId={workspaceId} projectId={projectId} />;
}
