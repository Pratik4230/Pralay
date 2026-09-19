"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { AcceptInviteCard } from "@/features/workspace/components/accept-invite-card";
import { CreateWorkspaceDialog } from "@/features/workspace/components/create-workspace-dialog";
import { GlobalTrashPanel } from "@/features/workspace/components/global-trash-panel";
import { WorkspaceList } from "@/features/workspace/components/workspace-list";
import type { MeResponse } from "@/features/workspace/types";

type DashboardPageClientProps = {
  user: MeResponse["user"];
};

export function DashboardPageClient({ user }: DashboardPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user.name}
        </h1>
      </div>

      <AcceptInviteCard />
      <WorkspaceList onCreateClick={() => setCreateOpen(true)} />

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Your Pralay account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Verified:</span>{" "}
            {user.emailVerified ? "Yes" : "No"}
          </p>
        </CardContent>
      </Card>

      {/* Global Trash – deleted workspaces */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setTrashOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{trashOpen ? "▾" : "▸"}</span>
          <span>🗑 Global Trash</span>
        </button>
        {trashOpen ? <GlobalTrashPanel /> : null}
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
