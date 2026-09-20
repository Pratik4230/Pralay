"use client";

import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";

import type { SidebarNavItem } from "@/global/components/app-sidebar";
import { AppSidebar } from "@/global/components/app-sidebar";

type AuthenticatedShellClientProps = {
  navItems: SidebarNavItem[];
  navbar: React.ReactNode;
  children: React.ReactNode;
};

export function AuthenticatedShellClient({
  navItems,
  navbar,
  children,
}: AuthenticatedShellClientProps) {
  return (
    <SidebarProvider>
      <AppSidebar navItems={navItems} />
      <SidebarInset>
        {navbar}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
