"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/validations/login.schema";
import { authClient } from "@/features/auth/utils/auth-client";
import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";

function getSafeRedirectPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginInput, string>>
  >({});

  const loginMutation = useMutation({
    mutationFn: async (values: LoginInput) => {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: redirectPath,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to sign in");
      }

      return data;
    },
    onSuccess: () => {
      router.push(redirectPath);
      router.refresh();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["email", "password"]));
      return;
    }

    loginMutation.mutate(parsed.data);
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <Form onSubmit={handleSubmit}>
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

            <Field data-invalid={!!fieldErrors.password}>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  scroll={false}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password ? (
                <FieldError>{fieldErrors.password}</FieldError>
              ) : null}
            </Field>

            {loginMutation.error ? (
              <FieldError>{loginMutation.error.message}</FieldError>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link
              href="/signup"
              scroll={false}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </Form>
    </Card>
  );
}
