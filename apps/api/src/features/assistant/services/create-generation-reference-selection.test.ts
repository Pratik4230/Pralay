import { describe, expect, test } from "bun:test";
import type { CreateChatReferenceCandidate } from "@repo/agents";

import { validateCreateGenerationReferenceSelection } from "./create-generation-reference-selection.js";

function candidate(
  id: string,
  isGenerated = false,
): CreateChatReferenceCandidate {
  return {
    id,
    name: id,
    category: "reference",
    tags: [],
    mimeType: "image/png",
    width: 100,
    height: 100,
    scope: "project",
    description: null,
    provenance: isGenerated ? "generated" : "history",
    sourceMessageId: null,
    sourceGenerationId: null,
    isGenerated,
  };
}

describe("Create generation reference selection", () => {
  test("preserves an exact authorized order", () => {
    const generated = candidate("generated", true);
    const identity = candidate("identity");
    const result = validateCreateGenerationReferenceSelection({
      mode: "variation",
      references: [
        { assetId: generated.id, role: "base" },
        { assetId: identity.id, role: "identity" },
      ],
      authorizedCandidates: new Map([
        [generated.id, generated],
        [identity.id, identity],
      ]),
    });

    expect(result).toEqual({
      ok: true,
      assetIds: ["generated", "identity"],
    });
  });

  test("rejects six references rather than truncating", () => {
    const candidates = Array.from({ length: 6 }, (_, index) =>
      candidate(`asset-${index}`),
    );
    const result = validateCreateGenerationReferenceSelection({
      mode: "generate",
      references: candidates.map((item) => ({
        assetId: item.id,
        role: "reference",
      })),
      authorizedCandidates: new Map(candidates.map((item) => [item.id, item])),
    });

    expect(result.ok).toBe(false);
  });

  test("requires a generated first reference for variations", () => {
    const regular = candidate("regular");
    const result = validateCreateGenerationReferenceSelection({
      mode: "variation",
      references: [{ assetId: regular.id, role: "base" }],
      authorizedCandidates: new Map([[regular.id, regular]]),
    });

    expect(result.ok).toBe(false);
  });

  test("rejects an unauthorized candidate", () => {
    const result = validateCreateGenerationReferenceSelection({
      mode: "generate",
      references: [{ assetId: "foreign", role: "reference" }],
      authorizedCandidates: new Map(),
    });

    expect(result.ok).toBe(false);
  });
});
