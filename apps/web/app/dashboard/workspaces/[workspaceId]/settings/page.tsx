import { WorkspaceSettingsPage } from "@/features/workspace/pages/workspace-settings-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceSettingsPage workspaceId={workspaceId} />;
}
