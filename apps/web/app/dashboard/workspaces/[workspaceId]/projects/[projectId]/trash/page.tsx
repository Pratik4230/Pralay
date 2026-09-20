import { ProjectTrashPage } from "@/features/workspace/pages/project-trash-page";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  return <ProjectTrashPage workspaceId={workspaceId} projectId={projectId} />;
}
