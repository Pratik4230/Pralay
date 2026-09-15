"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Form,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { createWorkspaceBodySchema } from "@repo/validators";

import { parseFieldErrors } from "@/features/auth/utils/parse-field-errors";
import { useCreateWorkspace } from "@/features/workspace/hooks/use-workspaces";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const createWorkspace = useCreateWorkspace();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = createWorkspaceBodySchema.safeParse({ name });
    if (!parsed.success) {
      setFieldErrors(parseFieldErrors(parsed.error, ["name"]));
      return;
    }

    createWorkspace.mutate(parsed.data, {
      onSuccess: (data) => {
        handleOpenChange(false);
        router.push(`/dashboard/workspaces/${data.workspace.id}`);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Start a new workspace for your team or personal projects.
          </DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.name}>
              <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
              <Input
                id="workspace-name"
                placeholder="Enter workspace name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name ? (
                <FieldError>{fieldErrors.name}</FieldError>
              ) : null}
            </Field>
            {createWorkspace.error ? (
              <FieldError>{createWorkspace.error.message}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? "Creating..." : "Create workspace"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
