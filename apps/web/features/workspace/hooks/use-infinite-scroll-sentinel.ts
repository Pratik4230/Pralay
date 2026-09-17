"use client";

import { useEffect, useRef } from "react";

type UseInfiniteScrollSentinelOptions = {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useInfiniteScrollSentinel({
  enabled,
  onLoadMore,
  rootMargin = "240px",
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin]);

  return sentinelRef;
}
