import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

type ResetPasswordPageProps = {
  email?: string;
};

export function ResetPasswordPage({ email }: ResetPasswordPageProps) {
  return (
    <>
      <AuthPageHeader
        title="Choose a new password"
        description={
          email
            ? `Enter the code we sent to ${email} and choose a new password.`
            : "Enter your reset code and choose a new password."
        }
      />
      <ResetPasswordForm email={email} />
    </>
  );
}
