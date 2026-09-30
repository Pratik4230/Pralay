import type { ReactNode } from "react";

type WorkspaceSectionShellProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function WorkspaceSectionShell({
  title,
  description,
  action,
  children,
}: WorkspaceSectionShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
