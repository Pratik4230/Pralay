import { redirect } from "next/navigation";

import { InvitePage } from "@/features/workspace/pages/invite-page";
import { getSessionServer } from "@/global/utils/session";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const session = await getSessionServer();

  if (!session) {
    const nextPath = token
      ? `/invite?token=${encodeURIComponent(token)}`
      : "/invite";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-10">
      <InvitePage />
    </div>
  );
}
