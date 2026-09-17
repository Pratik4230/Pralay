import { createApiError } from "../common/api-error.js";

export const assetNotFoundError = createApiError("NOT_FOUND", "Asset not found");

export const invalidAssetListCursorError = createApiError(
  "BAD_REQUEST",
  "Invalid pagination cursor",
);
