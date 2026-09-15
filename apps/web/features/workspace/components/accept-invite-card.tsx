"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Form,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { useAcceptWorkspaceInvite } from "@/features/workspace/hooks/use-workspaces";

export function AcceptInviteCard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const acceptInvite = useAcceptWorkspaceInvite();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      return;
    }
    acceptInvite.mutate(token.trim(), {
      onSuccess: (data) => {
        setToken("");
        router.push(`/dashboard/workspaces/${data.workspaceId}`);
      },
    });
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Join a workspace</CardTitle>
        <CardDescription>
          Enter the invite code from your email, or open the invite link we sent
          you.
        </CardDescription>
      </CardHeader>
      <Form onSubmit={handleSubmit}>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-token">Invite code</FieldLabel>
              <Input
                id="invite-token"
                placeholder="Enter invite code"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </Field>
            {acceptInvite.error ? (
              <FieldError>{acceptInvite.error.message}</FieldError>
            ) : null}
            {acceptInvite.isSuccess ? (
              <p className="text-sm text-muted-foreground">
                Invite accepted. Your workspace list has been updated.
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={acceptInvite.isPending}>
            {acceptInvite.isPending ? "Joining..." : "Accept invite"}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
}
