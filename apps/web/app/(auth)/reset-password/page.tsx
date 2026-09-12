import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { email } = await searchParams;
  return <ResetPasswordPage email={email} />;
}
