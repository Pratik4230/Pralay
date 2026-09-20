"use client";

import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";

import type { SidebarNavItem } from "@/global/components/app-sidebar";
import { AppSidebar } from "@/global/components/app-sidebar";

type AuthenticatedShellClientProps = {
  navItems: SidebarNavItem[];
  navbar: React.ReactNode;
  children: React.ReactNode;
};

function ShellContentFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

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
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<ShellContentFallback />}>{children}</Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
