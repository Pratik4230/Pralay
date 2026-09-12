import { AuthFormDivider } from "@/features/auth/components/auth-form-divider";
import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { getEnabledOAuthProviders } from "@/features/auth/utils/oauth-config";

export function LoginPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <>
      <AuthPageHeader
        title="Sign in"
        description="Access your workspace, library, and generations."
      />
      <OAuthButtons providers={oauthProviders} />
      {oauthProviders.length > 0 ? <AuthFormDivider /> : null}
      <LoginForm />
    </>
  );
}
