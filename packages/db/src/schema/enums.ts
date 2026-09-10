import { pgEnum } from "drizzle-orm/pg-core";

export const contextScopeEnum = pgEnum("context_scope", [
  "project_only",
  "project_and_workspace",
  "workspace",
]);

export const assetScopeEnum = pgEnum("asset_scope", ["user", "workspace"]);

export const assetVisibilityEnum = pgEnum("asset_visibility", [
  "workspace",
  "project",
  "private",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "upload",
  "generated",
  "edited",
  "export",
]);

export const assetCategoryEnum = pgEnum("asset_category", [
  "person",
  "logo",
  "product",
  "background",
  "reference",
  "other",
]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);

export const workspaceInviteStatusEnum = pgEnum("workspace_invite_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "editor",
  "viewer",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
]);

export const collectionScopeEnum = pgEnum("collection_scope", [
  "user",
  "workspace",
  "project",
]);

export const generationTypeEnum = pgEnum("generation_type", [
  "generate",
  "edit",
  "variation",
  "resize",
  "batch_item",
]);

export const generationStatusEnum = pgEnum("generation_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const presetCategoryEnum = pgEnum("preset_category", [
  "social",
  "developer",
  "marketing",
  "custom",
]);

export const brandKitAssetPurposeEnum = pgEnum("brand_kit_asset_purpose", [
  "logo",
  "reference",
  "style",
]);

export const templateVisibilityEnum = pgEnum("template_visibility", [
  "workspace",
  "project",
  "user",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "generation_complete",
  "generation_failed",
  "workspace_invite",
  "system",
]);
