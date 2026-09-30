"use client";

import type { FC } from "react";

export const CreateThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col px-2 text-center">
      <span className="inline-flex self-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
        Project create
      </span>
      <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both mt-4 text-3xl font-bold tracking-tight duration-200 sm:text-4xl">
        What will you create today?
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Describe your idea and use @ to reference assets from your library. Upload
        new files with the folder button below.
      </p>
    </div>
  );
};
