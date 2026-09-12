import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

type CheckEmailPageProps = {
  email?: string;
};

export function CheckEmailPage({ email }: CheckEmailPageProps) {
  return (
    <>
      <AuthPageHeader
        title="Check your inbox"
        description={
          email
            ? `Enter the 6-digit code we sent to ${email}.`
            : "Enter the 6-digit code we sent to your email."
        }
      />
      <VerifyEmailForm email={email} />
    </>
  );
}
