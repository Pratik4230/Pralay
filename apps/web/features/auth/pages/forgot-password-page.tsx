import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <>
      <AuthPageHeader
        title="Reset password"
        description="Enter your email and we will send you a reset code."
      />
      <ForgotPasswordForm />
    </>
  );
}
