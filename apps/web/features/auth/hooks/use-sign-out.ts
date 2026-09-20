"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { authClient } from "@/features/auth/utils/auth-client";

export function useSignOut() {
  const router = useRouter();

  return useMutation({
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
}
