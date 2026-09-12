import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

type ResetPasswordPageProps = {
  token?: string;
  error?: string;
};

export function ResetPasswordPage({ token, error }: ResetPasswordPageProps) {
  return (
    <>
      <AuthPageHeader
        title="Choose a new password"
        description="Set a new password for your Pralay account."
      />
      <ResetPasswordForm token={token} error={error} />
    </>
  );
}
