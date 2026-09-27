"use client";

import Image from "next/image";

import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";

import { CreateGenerationCard } from "@/features/create/components/create-generation-card";
import type { CreateThreadMessage } from "@/features/create/types/create-ui";
import { getMediaUrl } from "@/global/utils/media-url";

type CreateChatPanelProps = {
  messages: CreateThreadMessage[];
  projectName: string;
  compact?: boolean;
  className?: string;
};

function MessageBubble({ message }: { message: CreateThreadMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[10px] font-semibold",
            isUser ? "bg-foreground text-background" : "bg-primary/15 text-primary",
          )}
        >
          {isUser ? "You" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "min-w-0 max-w-[min(100%,42rem)]",
          isUser ? "text-right" : "text-left",
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-foreground text-background"
              : "bg-muted/80 text-foreground",
          )}
        >
          {message.content}
        </div>

        {message.attachments && message.attachments.length > 0 ? (
          <div
            className={cn(
              "mt-2 flex flex-wrap gap-2",
              isUser ? "justify-end" : "justify-start",
            )}
          >
            {message.attachments.map((asset) => {
              const url = getMediaUrl(asset.s3Key);
              return (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-lg border border-border/60 bg-card"
                >
                  <div className="relative size-16 bg-muted">
                    {url ? (
                      <Image
                        src={url}
                        alt={asset.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="max-w-24 truncate px-2 py-1 text-[10px]">
                    {asset.name}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        {message.generation ? (
          <CreateGenerationCard generation={message.generation} />
        ) : null}
      </div>
    </div>
  );
}

export function CreateChatPanel({
  messages,
  projectName,
  compact = false,
  className,
}: CreateChatPanelProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {!compact ? (
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">{projectName}</h2>
        </div>
      ) : (
        <p className="mb-4 text-xs font-medium text-muted-foreground">
          {projectName}
        </p>
      )}

      <div className="flex flex-col gap-6 pb-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
