import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { MeResponse } from "@/features/workspace/types/me";
import { fetchApiServer } from "@/global/utils/api-server";

export async function DashboardPage() {
  const data = await fetchApiServer<MeResponse>("/api/v1/me");
  const { user } = data;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user.name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            Auth is wired. Product surfaces come next.
          </CardDescription>
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
    </div>
  );
}
