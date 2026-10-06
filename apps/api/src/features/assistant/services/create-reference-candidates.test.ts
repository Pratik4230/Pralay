import { describe, expect, test } from "bun:test";

import { collectCreateReferenceCandidateSeeds } from "./create-reference-candidates.js";

describe("Create reference candidate collection", () => {
  test("orders current picks, latest generated output, then recent history", () => {
    const seeds = collectCreateReferenceCandidateSeeds({
      currentMessageId: "current-message",
      currentReferenceAssetIds: ["current"],
      recentMessages: [
        {
          id: "latest-message",
          referenceAssetIds: ["latest-reference"],
          generationId: "latest-generation",
        },
        {
          id: "older-message",
          referenceAssetIds: ["older-reference"],
          generationId: null,
        },
      ],
      generationRows: [
        {
          id: "latest-generation",
          status: "completed",
          outputAssetIds: ["latest-output"],
        },
      ],
    });

    expect(seeds.map((seed) => seed.assetId)).toEqual([
      "current",
      "latest-output",
      "latest-reference",
      "older-reference",
    ]);
    expect(seeds[1]).toMatchObject({
      provenance: "generated",
      sourceGenerationId: "latest-generation",
    });
  });

  test("deduplicates by first provenance and respects the catalog cap", () => {
    const seeds = collectCreateReferenceCandidateSeeds({
      currentMessageId: "current-message",
      currentReferenceAssetIds: ["shared", "current-2"],
      recentMessages: [
        {
          id: "latest-message",
          referenceAssetIds: ["shared", "history-1", "history-2"],
          generationId: null,
        },
      ],
      generationRows: [],
      limit: 3,
    });

    expect(seeds.map((seed) => seed.assetId)).toEqual([
      "shared",
      "current-2",
      "history-1",
    ]);
    expect(seeds[0]?.provenance).toBe("current");
  });
});
