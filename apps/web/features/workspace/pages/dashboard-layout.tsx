import { redirect } from "next/navigation";

import { DashboardShell } from "@/features/workspace/components/dashboard-shell";
import { getSessionServer } from "@/global/utils/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionServer();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
