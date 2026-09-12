import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getEnabledOAuthProviders } from "@/features/auth/utils/oauth-config";

export function SignupPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <>
      <AuthPageHeader
        title="Get started"
        description="Create an account to start generating with Pralay."
      />
      <OAuthButtons providers={oauthProviders} />
      {oauthProviders.length > 0 ? <AuthFormDivider /> : null}
      <SignupForm />
    </>
  );
}
