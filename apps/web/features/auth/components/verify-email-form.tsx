"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@repo/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";

import { AuthOtpInput } from "@/features/auth/components/auth-otp-input";
import { authClient } from "@/features/auth/utils/auth-client";
import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import {
  verifyEmailSchema,
  type VerifyEmailInput,
} from "@/features/auth/validations/verify-email.schema";

type VerifyEmailFormProps = {
  email?: string;
};

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof VerifyEmailInput, string>>
  >({});

  const verifyMutation = useMutation({
    mutationFn: async (values: VerifyEmailInput) => {
      if (!email) {
        throw new Error("Email is required to verify your account");
      }

      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp: values.otp,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to verify email");
      }
    },
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error("Email is required to resend the code");
      }

      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        throw new Error(error.message ?? "Unable to resend code");
      }
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = verifyEmailSchema.safeParse({ otp });
    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["otp"]));
      return;
    }

    verifyMutation.mutate(parsed.data);
  }

  if (!email) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>We could not find your email address.</p>
          <p>Sign up again or sign in to request a new code.</p>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent pt-6">
          <Button asChild className="w-full">
            <Link href="/signup" scroll={false}>
              Back to sign up
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.otp}>
              <FieldLabel htmlFor="otp">Verification code</FieldLabel>
              <AuthOtpInput
                id="otp"
                value={otp}
                onChange={setOtp}
                aria-invalid={!!fieldErrors.otp}
              />
              {fieldErrors.otp ? (
                <FieldError>{fieldErrors.otp}</FieldError>
              ) : null}
            </Field>

            {verifyMutation.error ? (
              <FieldError>{verifyMutation.error.message}</FieldError>
            ) : null}
            {resendMutation.error ? (
              <FieldError>{resendMutation.error.message}</FieldError>
            ) : null}
            {resendMutation.isSuccess ? (
              <p className="text-sm text-muted-foreground">
                A new code was sent to your email.
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-4 border-t-0 bg-transparent pt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? "Verifying..." : "Verify email"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
          >
            {resendMutation.isPending ? "Sending code..." : "Resend code"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or resend the code.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
