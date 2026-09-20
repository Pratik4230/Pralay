"use client";

import Link from "next/link";
import {
  BellIcon,
  ChevronDownIcon,
  SearchIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { SidebarTrigger } from "@repo/ui/components/sidebar";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { getMediaUrl } from "@/global/utils/media-url";

type AppNavbarProps = {
  userName: string;
  userEmail: string;
  userAvatarKey?: string | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppNavbar({
  userName,
  userEmail,
  userAvatarKey,
}: AppNavbarProps) {
  const signOut = useSignOut();
  const avatarUrl = getMediaUrl(userAvatarKey);

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      {/* Sidebar toggle (hamburger on mobile, collapse on desktop) */}
      <SidebarTrigger className="-ml-1 shrink-0" />

      {/* Search bar */}
      <div className="flex flex-1 items-center">
        <button
          type="button"
          className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
          aria-label="Search workspaces"
        >
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="flex-1 text-left text-sm">Search workspaces...</span>
          <kbd className="hidden rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notifications"
          className="relative"
        >
          <BellIcon className="size-4" />
          {/* Unread dot — placeholder */}
          {/* <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /> */}
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="size-7 shrink-0">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-30 truncate sm:inline">
                {userName}
              </span>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium">{userName}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <UserIcon className="size-3.5" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
            >
              <LogOutIcon className="size-3.5" />
              {signOut.isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
