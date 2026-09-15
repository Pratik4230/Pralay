import { SignOutButton } from "@/features/auth/components/sign-out-button";
import Link from "next/link";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Pralay
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
