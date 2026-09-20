import { WorkspaceProjectsPage } from "@/features/workspace/pages/workspace-projects-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceProjectsPage workspaceId={workspaceId} />;
}
