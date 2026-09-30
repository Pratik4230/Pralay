import type { CreateAttachedAsset } from "@/features/create/types/create-ui";

export type CreateAssetOption = CreateAttachedAsset & {
  category: string;
};
