import { WorkspaceLibraryPage } from "@/features/workspace/pages/workspace-library-page";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceLibraryPage workspaceId={workspaceId} />;
}
