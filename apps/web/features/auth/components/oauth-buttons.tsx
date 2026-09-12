"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import type { OAuthProvider } from "@/features/auth/utils/oauth-config";
import { authClient } from "@/features/auth/utils/auth-client";

const providerLabels: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

type OAuthButtonsProps = {
  providers: OAuthProvider[];
};

export function OAuthButtons({ providers }: OAuthButtonsProps) {
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(
    null,
  );

  const oauthMutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      setActiveProvider(provider);

      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });

      if (error) {
        throw new Error(error.message ?? "Unable to continue with OAuth");
      }
    },
    onSettled: () => {
      setActiveProvider(null);
    },
  });

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 grid gap-3">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="w-full"
          disabled={oauthMutation.isPending}
          onClick={() => oauthMutation.mutate(provider)}
        >
          {oauthMutation.isPending && activeProvider === provider
            ? "Redirecting..."
            : `Continue with ${providerLabels[provider]}`}
        </Button>
      ))}
      {oauthMutation.error ? (
        <p className="text-sm text-destructive">{oauthMutation.error.message}</p>
      ) : null}
    </div>
  );
}
