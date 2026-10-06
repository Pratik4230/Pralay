import type {
  CreateChatReferenceCandidate,
  CreateGenerationMode,
  CreateGenerationReference,
} from "@repo/agents";

export type CreateGenerationReferenceSelectionResult =
  { ok: true; assetIds: string[] } | { ok: false; message: string };

export function validateCreateGenerationReferenceSelection(input: {
  mode: CreateGenerationMode;
  references: CreateGenerationReference[];
  authorizedCandidateIds?: Set<string>;
  authorizedCandidates: Map<string, CreateChatReferenceCandidate>;
}): CreateGenerationReferenceSelectionResult {
  const assetIds = input.references.map((reference) => reference.assetId);

  if (assetIds.length > 5 || new Set(assetIds).size !== assetIds.length) {
    return {
      ok: false,
      message: "Choose an exact ordered set of at most five unique references.",
    };
  }
  const authorizedIds =
    input.authorizedCandidateIds ?? new Set(input.authorizedCandidates.keys());
  if (assetIds.some((assetId) => !authorizedIds.has(assetId))) {
    return {
      ok: false,
      message: "One or more selected references are not authorized candidates.",
    };
  }
  if (
    (input.mode === "edit" || input.mode === "variation") &&
    assetIds.length === 0
  ) {
    return {
      ok: false,
      message: `${input.mode} requires at least one selected reference image.`,
    };
  }
  if (
    input.mode === "variation" &&
    !input.authorizedCandidates.get(assetIds[0] ?? "")?.isGenerated
  ) {
    return {
      ok: false,
      message:
        "A variation must use a completed generated output as its first base reference.",
    };
  }

  return { ok: true, assetIds };
}
