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
import { Input } from "@repo/ui/components/input";

import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/validations/reset-password.schema";
import { authClient } from "@/features/auth/utils/auth-client";
import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";

type ResetPasswordFormProps = {
  token?: string;
  error?: string;
};

export function ResetPasswordForm({ token, error }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResetPasswordInput, string>>
  >({});

  const resetMutation = useMutation({
    mutationFn: async (values: ResetPasswordInput) => {
      if (!token) {
        throw new Error("Reset link is invalid or expired");
      }

      const { error: resetError } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (resetError) {
        throw new Error(resetError.message ?? "Unable to reset password");
      }
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(
        parseFieldErrors(parsed.error, ["password", "confirmPassword"]),
      );
      return;
    }

    resetMutation.mutate(parsed.data);
  }

  if (error || !token) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>This reset link is invalid or has expired.</p>
          <p>Request a new link and try again.</p>
        </CardContent>
        <CardFooter className="border-t-0 bg-transparent pt-6">
          <Button asChild className="w-full">
            <Link href="/forgot-password" scroll={false}>
              Request new link
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
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-4 border-t-0 bg-transparent pt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? "Updating password..." : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
