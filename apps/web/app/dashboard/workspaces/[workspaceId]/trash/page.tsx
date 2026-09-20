import { WorkspaceTrashPage } from "@/features/workspace/pages/workspace-trash-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceTrashPage workspaceId={workspaceId} />;
}
