export type OAuthProvider = "google" | "github";

export function getEnabledOAuthProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = [];

  if (process.env.NEXT_PUBLIC_OAUTH_GOOGLE === "true") {
    providers.push("google");
  }

  if (process.env.NEXT_PUBLIC_OAUTH_GITHUB === "true") {
    providers.push("github");
  }

  return providers;
}
