import { CheckEmailPage } from "@/features/auth/pages/check-email-page";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { email } = await searchParams;
  return <CheckEmailPage email={email} />;
}
