import { WorkspaceInvitesPage } from "@/features/workspace/pages/workspace-invites-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceInvitesPage workspaceId={workspaceId} />;
}
