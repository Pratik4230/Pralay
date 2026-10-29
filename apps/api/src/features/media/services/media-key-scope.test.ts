import { describe, expect, it } from "bun:test";

import { parseMediaKeyScope } from "./media-key-scope.js";

const workspaceId = "7f26cb1a-c0dd-4c85-897f-e53752840576";
const projectId = "fb209041-7e6d-47d5-a301-53131892f091";

describe("media key scope", () => {
  it("recognizes generated assets and thumbnails", () => {
    expect(
      parseMediaKeyScope(
        `uploads/workspaces/${workspaceId}/generated/result.png`,
      ),
    ).toEqual({ kind: "workspace-asset", workspaceId });
    expect(
      parseMediaKeyScope(
        `uploads/workspaces/${workspaceId}/thumbnails/preview.webp`,
      ),
    ).toEqual({ kind: "workspace-asset", workspaceId });
  });

  it("recognizes stored brand images and project covers", () => {
    expect(
      parseMediaKeyScope(`uploads/workspaces/${workspaceId}/avatars/a.png`),
    ).toEqual({ kind: "workspace-brand", workspaceId });
    expect(
      parseMediaKeyScope(`uploads/projects/${projectId}/covers/a.png`),
    ).toEqual({ kind: "project-cover", projectId });
  });

  it("rejects arbitrary keys and nested paths", () => {
    expect(parseMediaKeyScope("secret.txt")).toBeNull();
    expect(
      parseMediaKeyScope(
        `uploads/workspaces/${workspaceId}/generated/../secret`,
      ),
    ).toBeNull();
    expect(
      parseMediaKeyScope("uploads/workspaces/not-a-uuid/assets/image.png"),
    ).toBeNull();
  });
});
