import { relations } from "drizzle-orm";

import { assets } from "./assets.js";
import { assetVersions } from "./asset-versions.js";
import { brandKitAssets } from "./brand-kit-assets.js";
import { brandKits } from "./brand-kits.js";
import { collectionAssets } from "./collection-assets.js";
import { collections } from "./collections.js";
import { generationEvents } from "./generation-events.js";
import { generations } from "./generations.js";
import { notifications } from "./notifications.js";
import { presets } from "./presets.js";
import { projectAssets } from "./project-assets.js";
import { projectMembers } from "./project-members.js";
import { projects } from "./projects.js";
import { templates } from "./templates.js";
import { usageLedger, workspaceCredits } from "./usage.js";
import { userWorkspacePreferences } from "./user-workspace-preferences.js";
import { workspaceInvites } from "./workspace-invites.js";
import { workspaceMembers } from "./workspace-members.js";
import { workspaces } from "./workspaces.js";

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
  preferences: many(userWorkspacePreferences),
  projects: many(projects),
  assets: many(assets),
  collections: many(collections),
  generations: many(generations),
  brandKit: one(brandKits),
  credits: one(workspaceCredits),
  usageEntries: many(usageLedger),
  notifications: many(notifications),
  presets: many(presets),
  templates: many(templates),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const workspaceInvitesRelations = relations(
  workspaceInvites,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvites.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const userWorkspacePreferencesRelations = relations(
  userWorkspacePreferences,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [userWorkspacePreferences.workspaceId],
      references: [workspaces.id],
    }),
    lastProject: one(projects, {
      fields: [userWorkspacePreferences.lastProjectId],
      references: [projects.id],
    }),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  members: many(projectMembers),
  assets: many(projectAssets),
  collections: many(collections),
  generations: many(generations),
  templates: many(templates),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
}));

export const projectAssetsRelations = relations(projectAssets, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssets.projectId],
    references: [projects.id],
  }),
  asset: one(assets, {
    fields: [projectAssets.assetId],
    references: [assets.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [assets.workspaceId],
    references: [workspaces.id],
  }),
  primaryProject: one(projects, {
    fields: [assets.primaryProjectId],
    references: [projects.id],
  }),
  parentAsset: one(assets, {
    fields: [assets.parentAssetId],
    references: [assets.id],
    relationName: "asset_versions",
  }),
  childAssets: many(assets, { relationName: "asset_versions" }),
  sourceAsset: one(assets, {
    fields: [assets.sourceAssetId],
    references: [assets.id],
    relationName: "asset_forks",
  }),
  forkedAssets: many(assets, { relationName: "asset_forks" }),
  versions: many(assetVersions),
  projectLinks: many(projectAssets),
  collectionLinks: many(collectionAssets),
  brandKitLinks: many(brandKitAssets),
}));

export const assetVersionsRelations = relations(assetVersions, ({ one }) => ({
  asset: one(assets, {
    fields: [assetVersions.assetId],
    references: [assets.id],
  }),
  generation: one(generations, {
    fields: [assetVersions.generationId],
    references: [generations.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [collections.projectId],
    references: [projects.id],
  }),
  assets: many(collectionAssets),
}));

export const collectionAssetsRelations = relations(
  collectionAssets,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionAssets.collectionId],
      references: [collections.id],
    }),
    asset: one(assets, {
      fields: [collectionAssets.assetId],
      references: [assets.id],
    }),
  }),
);

export const generationsRelations = relations(generations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [generations.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id],
  }),
  preset: one(presets, {
    fields: [generations.presetId],
    references: [presets.id],
  }),
  batch: one(generations, {
    fields: [generations.batchId],
    references: [generations.id],
    relationName: "generation_batch",
  }),
  batchItems: many(generations, { relationName: "generation_batch" }),
  events: many(generationEvents),
  assetVersions: many(assetVersions),
  usageEntries: many(usageLedger),
}));

export const generationEventsRelations = relations(
  generationEvents,
  ({ one }) => ({
    generation: one(generations, {
      fields: [generationEvents.generationId],
      references: [generations.id],
    }),
  }),
);

export const brandKitsRelations = relations(brandKits, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [brandKits.workspaceId],
    references: [workspaces.id],
  }),
  assets: many(brandKitAssets),
}));

export const brandKitAssetsRelations = relations(brandKitAssets, ({ one }) => ({
  brandKit: one(brandKits, {
    fields: [brandKitAssets.brandKitId],
    references: [brandKits.id],
  }),
  asset: one(assets, {
    fields: [brandKitAssets.assetId],
    references: [assets.id],
  }),
}));

export const presetsRelations = relations(presets, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [presets.workspaceId],
    references: [workspaces.id],
  }),
  generations: many(generations),
  templates: many(templates),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [templates.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [templates.projectId],
    references: [projects.id],
  }),
  preset: one(presets, {
    fields: [templates.presetId],
    references: [presets.id],
  }),
}));

export const workspaceCreditsRelations = relations(
  workspaceCredits,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceCredits.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const usageLedgerRelations = relations(usageLedger, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [usageLedger.workspaceId],
    references: [workspaces.id],
  }),
  generation: one(generations, {
    fields: [usageLedger.generationId],
    references: [generations.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));
