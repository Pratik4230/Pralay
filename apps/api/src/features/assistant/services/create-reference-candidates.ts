import type { CreateChatReferenceCandidate } from "@repo/agents";

export type CreateReferenceCandidateSeed = {
  assetId: string;
  provenance: CreateChatReferenceCandidate["provenance"];
  sourceMessageId: string | null;
  sourceGenerationId: string | null;
};

export function collectCreateReferenceCandidateSeeds(input: {
  currentMessageId: string;
  currentReferenceAssetIds: string[];
  recentMessages: Array<{
    id: string;
    referenceAssetIds: string[];
    generationId: string | null;
  }>;
  generationRows: Array<{
    id: string;
    status: string;
    outputAssetIds: string[];
  }>;
  limit?: number;
}): CreateReferenceCandidateSeed[] {
  const generationById = new Map(
    input.generationRows.map((row) => [row.id, row]),
  );
  const seeds: CreateReferenceCandidateSeed[] =
    input.currentReferenceAssetIds.map((assetId) => ({
      assetId,
      provenance: "current",
      sourceMessageId: input.currentMessageId,
      sourceGenerationId: null,
    }));

  // recentMessages is newest first. Generated outputs precede that message's
  // older source references so the latest editable base keeps higher recency.
  for (const message of input.recentMessages) {
    const generation = message.generationId
      ? generationById.get(message.generationId)
      : undefined;
    if (generation?.status === "completed") {
      for (const assetId of generation.outputAssetIds) {
        seeds.push({
          assetId,
          provenance: "generated",
          sourceMessageId: message.id,
          sourceGenerationId: generation.id,
        });
      }
    }
    for (const assetId of message.referenceAssetIds) {
      seeds.push({
        assetId,
        provenance: "history",
        sourceMessageId: message.id,
        sourceGenerationId: message.generationId,
      });
    }
  }

  const unique: CreateReferenceCandidateSeed[] = [];
  const seen = new Set<string>();
  for (const seed of seeds) {
    if (seen.has(seed.assetId)) continue;
    seen.add(seed.assetId);
    unique.push(seed);
    if (unique.length >= (input.limit ?? 24)) break;
  }

  return unique;
}
