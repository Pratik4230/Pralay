import type { Metadata } from "next";

import { GlobalTrashPanel } from "@/features/workspace/components/global-trash-panel";

export const metadata: Metadata = {
  title: "Global Trash | Pralay",
  description: "Review and manage deleted workspaces",
};

export default function GlobalTrashPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Global Trash</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Deleted workspaces are automatically purged after 29 days.
          Only workspace owners can restore or permanently delete them.
        </p>
      </div>

      <GlobalTrashPanel />
    </div>
  );
}
