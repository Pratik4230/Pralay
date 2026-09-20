import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

type WorkspaceOverviewSectionHeaderProps = {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

export function WorkspaceOverviewSectionHeader({
  title,
  description,
  href,
  linkLabel = "View all",
}: WorkspaceOverviewSectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {linkLabel}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
