"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CameraIcon, MailIcon, UserIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";

import type { MeResponse } from "@/features/workspace/types";
import { AcceptInviteCard } from "@/features/workspace/components/accept-invite-card";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { getMediaUrl } from "@/global/utils/media-url";
import { timeAgo } from "@/global/utils/time-ago";

type ProfilePageClientProps = {
  user: MeResponse["user"];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfilePageClient({ user }: ProfilePageClientProps) {
  const signOut = useSignOut();
  const avatarUrl = getMediaUrl(user.image);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and workspace memberships.
        </p>
      </div>

      {/* ── User card ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {/* Cover strip */}
        <div className="h-20 w-full bg-linear-to-br from-primary/30 via-secondary to-muted" />

        {/* Avatar + info */}
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar overlaid on cover */}
          <div className="-mt-8 shrink-0">
            <Avatar className="size-16 border-2 border-background shadow-md ring-2 ring-primary/20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-foreground text-background text-xl font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name + meta */}
          <div className="flex flex-1 flex-col gap-1 pt-2 sm:pt-0">
            <h2 className="text-xl font-bold tracking-tight leading-none">
              {user.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MailIcon className="size-3" />
                {user.email}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-3" />
                Joined {timeAgo(user.createdAt)}
              </span>
              {user.emailVerified ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* ── Join a workspace ─────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Join a workspace</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enter an invite code from your email to join a team workspace.
          </p>
        </div>
        <AcceptInviteCard />
      </section>

      <Separator className="my-8" />

      {/* ── Account actions ──────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </section>
    </div>
  );
}
