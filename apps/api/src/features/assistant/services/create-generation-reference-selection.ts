import type {
  CreateChatReferenceCandidate,
  CreateGenerationMode,
  CreateGenerationReference,
} from "@repo/agents";

export type CreateGenerationReferenceSelectionResult =
  { ok: true; assetIds: string[] } | { ok: false; message: string };

/** An editor turn pins its base image even if the model proposes other references. */
export function resolveEditorReferences(input: {
  editSourceAssetId?: string;
  modelReferences?: CreateGenerationReference[];
}): CreateGenerationReference[] {
  if (input.editSourceAssetId) {
    return [{ assetId: input.editSourceAssetId, role: "source" }];
  }
  return input.modelReferences ?? [];
}

/** Generated and uploaded source images both use the single edit mode. */
export function resolveCreateGenerationMode(input: {
  requestedMode: CreateGenerationMode;
  firstAssetId: string | undefined;
  authorizedCandidates: Map<string, CreateChatReferenceCandidate>;
}): CreateGenerationMode {
  return input.requestedMode;
}

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
  if (input.mode === "edit" && assetIds.length === 0) {
    return {
      ok: false,
      message: `${input.mode} requires at least one selected reference image.`,
    };
  }
  return { ok: true, assetIds };
}
