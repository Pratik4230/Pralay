import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/global/components/authenticated-shell";
import { dashboardNavItems } from "@/global/components/app-sidebar";
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

  return (
    <AuthenticatedShell navItems={dashboardNavItems}>
      {children}
    </AuthenticatedShell>
  );
}
