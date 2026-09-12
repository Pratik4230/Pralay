import Link from "next/link";

import { cn } from "@repo/ui/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">
      <aside className="relative hidden overflow-hidden bg-brand-black lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,oklch(0.704_0.187_47/0.4),transparent_50%)]" />
        <div className="relative">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-brand-white"
          >
            Pralay
          </Link>
        </div>
        <div className="relative space-y-4">
          <p className="max-w-md text-3xl font-semibold tracking-tight text-brand-white">
            Create with clarity.
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-brand-bisque/90">
            Generate, refine, and organize visual work in one workspace.
          </p>
        </div>
        <p className="relative text-xs text-brand-bisque/50">
          AI creative platform
        </p>
      </aside>

      <main
        className={cn(
          "flex min-h-screen w-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-12",
          className,
        )}
      >
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
