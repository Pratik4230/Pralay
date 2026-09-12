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
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/validations/forgot-password.schema";
import { authClient } from "@/features/auth/utils/auth-client";
import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ForgotPasswordInput, string>>
  >({});

  const forgotMutation = useMutation({
    mutationFn: async (values: ForgotPasswordInput) => {
      const { error } = await authClient.emailOtp.requestPasswordReset({
        email: values.email,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to send reset code");
      }

      return values.email;
    },
    onSuccess: (submittedEmail) => {
      router.push(
        `/reset-password?email=${encodeURIComponent(submittedEmail)}`,
      );
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["email"]));
      return;
    }

    forgotMutation.mutate(parsed.data);
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email ? (
                <FieldError>{fieldErrors.email}</FieldError>
              ) : null}
            </Field>

            {forgotMutation.error ? (
              <FieldError>{forgotMutation.error.message}</FieldError>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-4 border-t-0 bg-transparent pt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={forgotMutation.isPending}
          >
            {forgotMutation.isPending ? "Sending code..." : "Send reset code"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/login"
              scroll={false}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
