import Link from "next/link";

import { Button } from "@repo/ui/components/button";

export function LandingHero() {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-12 lg:flex-row lg:items-center lg:gap-20 lg:pt-20">
      <div className="flex-1 space-y-6">
        <p className="inline-flex rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          AI creative platform
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          From prompt to polished visuals, without the friction.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Generate, refine, and organize creative work in one workspace, built
          for speed, clarity, and teams that ship.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="lg" asChild>
            <Link href="/signup">Start creating</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute -inset-4 rounded-3xl bg-brand-orange/10 blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-brand-orange/80" />
              <span className="size-2.5 rounded-full bg-brand-bisque" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-brand-orange" />
              <div className="h-2 w-full max-w-xs rounded-full bg-muted" />
              <div className="h-2 w-full max-w-sm rounded-full bg-muted/80" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-4/3 rounded-xl bg-brand-bisque/60 ring-1 ring-border/50" />
              <div className="aspect-4/3 rounded-xl bg-brand-black ring-1 ring-border/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
