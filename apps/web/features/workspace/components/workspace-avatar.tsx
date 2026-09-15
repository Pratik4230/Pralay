import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";

import { getWorkspaceInitials } from "@/features/workspace/utils/workspace-helpers";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceAvatarProps = {
  name: string;
  avatarKey?: string | null;
  previewUrl?: string | null;
  className?: string;
};

export function WorkspaceAvatar({
  name,
  avatarKey,
  previewUrl,
  className,
}: WorkspaceAvatarProps) {
  const imageUrl = previewUrl ?? getMediaUrl(avatarKey);

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted",
          className,
        )}
      >
        <Image
          src={imageUrl}
          alt={`${name} avatar`}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {getWorkspaceInitials(name)}
    </div>
  );
}
