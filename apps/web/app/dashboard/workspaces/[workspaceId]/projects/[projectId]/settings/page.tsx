import { ProjectSettingsPage } from "@/features/workspace/pages/project-settings-page";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  return (
    <ProjectSettingsPage workspaceId={workspaceId} projectId={projectId} />
  );
}
