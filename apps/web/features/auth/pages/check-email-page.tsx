import Link from "next/link";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { AuthPageHeader } from "@/features/auth/components/auth-page-header";

type CheckEmailPageProps = {
  email?: string;
};

export function CheckEmailPage({ email }: CheckEmailPageProps) {
  return (
    <>
      <AuthPageHeader
        title="Check your inbox"
        description="We sent a verification link to finish setting up your account."
      />
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            {email
              ? `Open the link we sent to ${email}.`
              : "Open the verification link in your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            After verifying, you&apos;ll be signed in and redirected to your
            workspace.
          </p>
          <p>
            In local development, check the API terminal for the verification
            link.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent pt-0">
          <Button asChild className="w-full">
            <Link href="/login" scroll={false}>
              Back to sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
