"use client";

import { useQuery } from "@tanstack/react-query";

import type { MeResponse } from "@/features/workspace/types";
import { meKeys } from "@/features/workspace/utils/query-keys";
import { fetchApiClient } from "@/global/utils/api-client";

export function useMe() {
  return useQuery({
    queryKey: meKeys.current,
    queryFn: () => fetchApiClient<MeResponse>("/api/v1/me"),
  });
}
