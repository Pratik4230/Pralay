"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { useAcceptWorkspaceInvite } from "@/features/workspace/hooks/use-workspaces";

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const acceptInvite = useAcceptWorkspaceInvite();

  useEffect(() => {
    if (!token || acceptInvite.isPending || acceptInvite.isSuccess) {
      return;
    }

    acceptInvite.mutate(token, {
      onSuccess: (data) => {
        router.replace(`/dashboard/workspaces/${data.workspaceId}`);
      },
    });
    // Accept once per invite token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>
            This invite link is missing a token.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t-0 bg-transparent">
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Join workspace</CardTitle>
        <CardDescription>
          {acceptInvite.isPending
            ? "Accepting your invite..."
            : "We are processing your workspace invite."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {acceptInvite.error ? (
          <p className="text-sm text-destructive">{acceptInvite.error.message}</p>
        ) : null}
        {acceptInvite.isSuccess ? (
          <p className="text-sm text-muted-foreground">
            Invite accepted. Redirecting...
          </p>
        ) : null}
      </CardContent>
      {acceptInvite.error ? (
        <CardFooter className="gap-3 border-t-0 bg-transparent">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Sign in
          </Button>
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InvitePageContent />
    </Suspense>
  );
}
