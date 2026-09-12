import Link from "next/link";

type AuthPageHeaderProps = {
  title: string;
  description: string;
};

export function AuthPageHeader({ title, description }: AuthPageHeaderProps) {
  return (
    <div className="mb-8 space-y-2">
      <div className="lg:hidden">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Pralay
        </Link>
      </div>
      <div className="mt-8 space-y-2 lg:mt-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
