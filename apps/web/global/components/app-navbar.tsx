"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { isProjectRoute } from "@/features/workspace/utils/project-nav";
import { isWorkspaceRoute } from "@/features/workspace/utils/workspace-nav";
import { getMediaUrl } from "@/global/utils/media-url";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/global/hooks/use-notifications";

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
  const pathname = usePathname();
  const signOut = useSignOut();
  const notifications = useNotifications();
  const markNotificationRead = useMarkNotificationRead();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const avatarUrl = getMediaUrl(userAvatarKey);
  const inProject = isProjectRoute(pathname);
  const inWorkspace = !inProject && isWorkspaceRoute(pathname);
  const searchLabel = inProject
    ? "Search in this project..."
    : inWorkspace
      ? "Search in this workspace..."
      : "Search workspaces...";
  const searchAriaLabel = inProject
    ? "Search in this project"
    : inWorkspace
      ? "Search in this workspace"
      : "Search workspaces";

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      {/* Sidebar toggle (hamburger on mobile, collapse on desktop) */}
      <SidebarTrigger className="-ml-1 shrink-0" />

      {/* Search bar */}
      <div className="flex flex-1 items-center">
        <button
          type="button"
          className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
          aria-label={searchAriaLabel}
        >
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="flex-1 text-left text-sm">{searchLabel}</span>
          <kbd className="hidden rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Notifications${notifications.data?.unreadCount ? `, ${notifications.data.unreadCount} unread` : ""}`}
              className="relative"
            >
              <BellIcon className="size-4" />
              {notifications.data?.unreadCount ? (
                <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground">
                  {notifications.data.unreadCount > 99
                    ? "99+"
                    : notifications.data.unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-96 max-w-[calc(100vw-2rem)]"
          >
            <DropdownMenuLabel className="flex items-center justify-between gap-3">
              <span>Notifications</span>
              {notifications.data?.unreadCount ? (
                <button
                  type="button"
                  className="text-xs font-normal text-primary hover:underline"
                  onClick={() => markAllNotificationsRead.mutate()}
                  disabled={markAllNotificationsRead.isPending}
                >
                  Mark all read
                </button>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notifications.isLoading ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </p>
              ) : notifications.data?.notifications.length ? (
                notifications.data.notifications.map((notification) => {
                  const href =
                    typeof notification.metadata.href === "string"
                      ? notification.metadata.href
                      : "/dashboard";
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      asChild
                      className="items-start p-0"
                    >
                      <Link
                        href={href}
                        className="flex w-full gap-3 px-3 py-3"
                        onClick={() => {
                          if (!notification.readAt) {
                            markNotificationRead.mutate(notification.id);
                          }
                        }}
                      >
                        <span
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.readAt ? "bg-muted" : "bg-primary"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                            {notification.body}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
