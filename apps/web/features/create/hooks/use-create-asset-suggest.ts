"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { CreateAssetSuggestItem } from "@repo/validators";

import { CREATE_ASSET_SUGGEST_DEBOUNCE_MS } from "@/features/create/constants/create-timing";
import type { CreateAssetOption } from "@/features/create/types/create-asset-option";
import { fetchCreateAssetSuggest } from "@/features/create/utils/fetch-create-asset-suggest";
import { workspaceKeys } from "@/features/workspace/utils/query-keys";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function mapSuggestItem(item: CreateAssetSuggestItem): CreateAssetOption {
  return {
    id: item.id,
    name: item.name,
    s3Key: item.s3Key,
    scope: item.scope,
    category: "other",
  };
}

export function useCreateAssetSuggest(
  workspaceId: string,
  projectId: string,
  query: string,
  enabled: boolean,
) {
  const debouncedQuery = useDebouncedValue(query, CREATE_ASSET_SUGGEST_DEBOUNCE_MS);

  const result = useQuery({
    queryKey: workspaceKeys.assetSuggest(
      workspaceId,
      projectId,
      debouncedQuery,
    ),
    queryFn: () =>
      fetchCreateAssetSuggest(workspaceId, projectId, debouncedQuery, 10),
    enabled: enabled && Boolean(workspaceId) && Boolean(projectId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const options = (result.data?.items ?? []).map(mapSuggestItem);

  const showLoading =
    enabled &&
    (result.isLoading || (result.isFetching && options.length === 0));

  return {
    options,
    isLoading: showLoading,
    isError: result.isError,
  };
}
