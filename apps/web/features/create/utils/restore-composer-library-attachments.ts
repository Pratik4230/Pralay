import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { fetchCreateAssetSuggest } from "@/features/create/utils/fetch-create-asset-suggest";

export function parseAssetMentionNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/@([^\s@]+)/g)) {
    const name = match[1]?.trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * After navigation back to Create, rebuild staged `@` refs from the saved draft (no composer tiles).
 */
export async function restoreComposerLibraryAttachments(
  workspaceId: string,
  projectId: string,
) {
  const store = useCreateProjectStore.getState();
  store.ensureProject(projectId);

  const slice = store.byProject[projectId];
  if (!slice) return;

  const draft = slice.session.draft;
  const mentionNames = parseAssetMentionNames(draft);
  let staged = [...slice.stagedAssets];

  for (const name of mentionNames) {
    if (staged.some((asset) => asset.name === name)) continue;

    try {
      const suggest = await fetchCreateAssetSuggest(
        workspaceId,
        projectId,
        name,
        12,
      );
      const match =
        suggest.items.find((item) => item.name === name) ?? suggest.items[0];
      if (!match) continue;

      staged = [
        ...staged.filter((asset) => asset.id !== match.id),
        {
          id: match.id,
          name: match.name,
          s3Key: match.s3Key,
          scope: match.scope,
        },
      ];
    } catch {
      // ignore resolve errors on restore
    }
  }

  if (staged.length !== slice.stagedAssets.length) {
    store.setStagedAssets(projectId, () => staged);
  }
}
