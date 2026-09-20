import type { SidebarNavItem } from "@/global/components/app-sidebar";
import { AuthenticatedShellClient } from "@/global/components/authenticated-shell-client";
import { AppNavbarServer } from "@/global/components/app-navbar-server";

type AuthenticatedShellProps = {
  navItems: SidebarNavItem[];
  children: React.ReactNode;
};

// Server Component — fetches navbar user data server-side, hands off
// client interactivity (sidebar state) to AuthenticatedShellClient.
export async function AuthenticatedShell({
  navItems,
  children,
}: AuthenticatedShellProps) {
  const navbar = await AppNavbarServer();

  return (
    <AuthenticatedShellClient navItems={navItems} navbar={navbar}>
      {children}
    </AuthenticatedShellClient>
  );
}
