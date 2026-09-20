import { WorkspaceMembersPage } from "@/features/workspace/pages/workspace-members-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceMembersPage workspaceId={workspaceId} />;
}
