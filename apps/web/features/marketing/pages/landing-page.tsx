import Link from "next/link";

import { Button } from "@repo/ui/components/button";

import { LandingHero } from "@/features/marketing/components/landing-hero";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,oklch(0.901_0.048_76/0.45),transparent_70%)]" />

      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Pralay
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <LandingHero />
    </div>
  );
}
