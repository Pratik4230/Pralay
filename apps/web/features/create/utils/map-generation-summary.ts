import type { AssistantMessageGenerationSummary } from "@repo/validators";

import type { CreateGenerationBlock } from "@/features/create/types/create-ui";

export function mapGenerationSummaryToCreateBlock(
  summary: AssistantMessageGenerationSummary,
  referenceNames: string[],
): CreateGenerationBlock {
  return {
    id: summary.id,
    status: summary.status,
    prompt: summary.prompt,
    referenceNames,
    errorMessage: summary.errorMessage,
    outputAssets: summary.outputAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      s3Key: asset.s3Key,
      mimeType: asset.mimeType,
    })),
  };
}

export function isActiveGenerationStatus(
  status: CreateGenerationBlock["status"],
): boolean {
  return status === "queued" || status === "processing";
}
