import type { CreateAttachedAsset } from "@/features/create/types/create-ui";
import { textIncludesAssetMention } from "@/features/create/utils/create-asset-mention-sync";

/** Reference assets still mentioned with `@name` in the prompt at send time. */
export function resolveCreateSendReferenceAssets(
  stagedLibraryAssets: CreateAttachedAsset[],
  prompt: string,
): CreateAttachedAsset[] {
  return stagedLibraryAssets.filter((asset) =>
    textIncludesAssetMention(prompt, asset.name),
  );
}
