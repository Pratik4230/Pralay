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
  Form,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { AuthOtpInput } from "@/features/auth/components/auth-otp-input";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/validations/reset-password.schema";
import { authClient } from "@/features/auth/utils/auth-client";
import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";

type ResetPasswordFormProps = {
  email?: string;
};

export function ResetPasswordForm({ email }: ResetPasswordFormProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResetPasswordInput, string>>
  >({});

  const resetMutation = useMutation({
    mutationFn: async (values: ResetPasswordInput) => {
      if (!email) {
        throw new Error("Email is required to reset your password");
      }

      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp: values.otp,
        password: values.password,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to reset password");
      }
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error("Email is required to resend the code");
      }

      const { error } = await authClient.emailOtp.requestPasswordReset({
        email,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to resend code");
      }
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({
      otp,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setFieldErrors(
        parseFieldErrors(parsed.error, ["otp", "password", "confirmPassword"]),
      );
      return;
    }

    resetMutation.mutate(parsed.data);
  }

  if (!email) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>Start from the forgot password page to request a reset code.</p>
        </CardContent>
        <CardFooter className="border-t-0 bg-transparent">
          <Button asChild className="w-full">
            <Link href="/forgot-password" scroll={false}>
              Request reset code
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <Form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.otp}>
              <FieldLabel htmlFor="otp">Reset code</FieldLabel>
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

            <Field data-invalid={!!fieldErrors.password}>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password ? (
                <FieldError>{fieldErrors.password}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!fieldErrors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              {fieldErrors.confirmPassword ? (
                <FieldError>{fieldErrors.confirmPassword}</FieldError>
              ) : null}
            </Field>

            {resetMutation.error ? (
              <FieldError>{resetMutation.error.message}</FieldError>
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
        <CardFooter className="flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? "Updating password..." : "Reset password"}
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
      </Form>
    </Card>
  );
}
