import type { CreateAssetSuggestResponse } from "@repo/validators";

import { fetchApiClient } from "@/global/utils/api-client";

export async function fetchCreateAssetSuggest(
  workspaceId: string,
  projectId: string,
  q: string,
  limit = 10,
) {
  const params = new URLSearchParams({
    projectId,
    limit: String(limit),
  });

  if (q.trim().length > 0) {
    params.set("q", q.trim());
  }

  return fetchApiClient<CreateAssetSuggestResponse>(
    `/api/v1/workspaces/${workspaceId}/assets/suggest?${params.toString()}`,
  );
}
