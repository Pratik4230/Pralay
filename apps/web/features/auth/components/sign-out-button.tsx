"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@repo/ui/components/button";

import { authClient } from "@/features/auth/utils/auth-client";

export function SignOutButton() {
  const router = useRouter();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) {
        throw new Error(error.message ?? "Unable to sign out");
      }
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => signOutMutation.mutate()}
      disabled={signOutMutation.isPending}
    >
      {signOutMutation.isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
