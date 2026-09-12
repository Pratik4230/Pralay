import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page";

type PageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { token, error } = await searchParams;
  return <ResetPasswordPage token={token} error={error} />;
}
