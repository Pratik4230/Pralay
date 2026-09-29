import { and, eq, isNull, or, inArray } from "drizzle-orm";

import {
  generateProjectImage,
  resolveImageGenerationDefaults,
} from "@repo/ai";
import { db } from "@repo/db";
import { assets, assistantMessages, generationEvents, generations, projectAssets } from "@repo/db/schema";
import { hasXaiApiKey } from "@repo/env";
import {
  buildGeneratedAssetKey,
  createPresignedDownloadUrl,
  isStorageConfigured,
  putObjectBuffer,
  storageEnv,
} from "@repo/storage";
import type { CreateProjectGenerationBody } from "@repo/validators";
import { normalizeWorkspaceAssetDisplayNameOrDefault } from "@repo/validators/asset";

import { inngest } from "../../../inngest/client.js";
import {
  getWorkspaceProject,
  ProjectNotFoundError,
} from "../../projects/services/workspace-projects.service.js";
import { requireWorkspaceMembership } from "../../workspace/services/workspace-access.service.js";

export class GenerationNotFoundError extends Error {
  constructor() {
    super("Generation not found");
    this.name = "GenerationNotFoundError";
  }
}

export class InvalidGenerationInputAssetsError extends Error {
  constructor() {
    super("One or more reference assets are invalid for this project");
    this.name = "InvalidGenerationInputAssetsError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

type GenerationRow = typeof generations.$inferSelect;

type OutputAssetPreview = {
  id: string;
  name: string;
  s3Key: string;
  mimeType: string;
};

async function loadOutputAssetPreviews(
  outputAssetIds: string[],
): Promise<OutputAssetPreview[]> {
  if (outputAssetIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      s3Key: assets.s3Key,
      mimeType: assets.mimeType,
    })
    .from(assets)
    .where(inArray(assets.id, outputAssetIds));

  return rows;
}

export function mapGeneration(
  row: GenerationRow,
  outputAssets: OutputAssetPreview[] = [],
) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    status: row.status,
    type: row.type,
    prompt: row.prompt,
    inputAssetIds: row.inputAssetIds,
    outputAssetIds: row.outputAssetIds,
    outputAssets,
    aspectRatio: row.aspectRatio,
    provider: row.provider,
    model: row.model,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function mapGenerationWithOutputs(row: GenerationRow) {
  const outputAssets = await loadOutputAssetPreviews(row.outputAssetIds);
  return mapGeneration(row, outputAssets);
}

async function assertInputAssets(
  workspaceId: string,
  projectId: string,
  inputAssetIds: string[],
) {
  if (inputAssetIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        inArray(assets.id, inputAssetIds),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
        or(
          isNull(assets.primaryProjectId),
          eq(assets.primaryProjectId, projectId),
        ),
      ),
    );

  if (rows.length !== inputAssetIds.length) {
    throw new InvalidGenerationInputAssetsError();
  }
}

async function loadReferenceImageUrls(
  workspaceId: string,
  projectId: string,
  inputAssetIds: string[],
): Promise<string[]> {
  if (inputAssetIds.length === 0) {
    return [];
  }

  await assertInputAssets(workspaceId, projectId, inputAssetIds);

  const rows = await db
    .select({
      id: assets.id,
      s3Key: assets.s3Key,
      mimeType: assets.mimeType,
    })
    .from(assets)
    .where(
      and(
        inArray(assets.id, inputAssetIds.slice(0, 5)),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
      ),
    );

  const order = new Map(inputAssetIds.map((id, index) => [id, index]));
  rows.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );

  const urls: string[] = [];
  for (const row of rows) {
    if (!row.mimeType.startsWith("image/")) continue;
    urls.push(
      await createPresignedDownloadUrl({
        key: row.s3Key,
        expiresIn: 3600,
      }),
    );
  }

  return urls.slice(0, 5);
}

async function recordGenerationEvent(
  generationId: string,
  status: GenerationRow["status"],
  message?: string,
) {
  await db.insert(generationEvents).values({
    generationId,
    status,
    message: message ?? null,
  });
}

export type InsertProjectGenerationInput = {
  workspaceId: string;
  projectId: string;
  createdBy: string;
  prompt: string;
  inputAssetIds: string[];
  aspectRatio?: string | null;
};

export async function insertQueuedProjectGeneration(
  input: InsertProjectGenerationInput,
) {
  const { provider, model } = resolveImageGenerationDefaults();

  const generation = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(generations)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        createdBy: input.createdBy,
        type: "generate",
        status: "queued",
        prompt: input.prompt,
        inputAssetIds: input.inputAssetIds,
        aspectRatio: input.aspectRatio ?? null,
        provider,
        model,
        variationCount: 1,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create generation");
    }

    await tx.insert(generationEvents).values({
      generationId: created.id,
      status: "queued",
      message: "Generation queued",
    });

    return created;
  });

  await inngest.send({
    name: "pralay/generation.requested",
    data: { generationId: generation.id },
  });

  return generation;
}

/** Enqueue image generation and link it to a Create user message. */
export async function attachGenerationToAssistantUserMessage(input: {
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  messageId: string;
  prompt: string;
  inputAssetIds: string[];
  aspectRatio?: string | null;
}) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await assertInputAssets(
    input.workspaceId,
    input.projectId,
    input.inputAssetIds,
  );

  const generationRow = await insertQueuedProjectGeneration({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    createdBy: input.actorUserId,
    prompt: input.prompt,
    inputAssetIds: input.inputAssetIds,
    aspectRatio: input.aspectRatio,
  });

  const [updatedMessage] = await db
    .update(assistantMessages)
    .set({ generationId: generationRow.id })
    .where(
      and(
        eq(assistantMessages.id, input.messageId),
        eq(assistantMessages.role, "user"),
      ),
    )
    .returning();

  if (!updatedMessage) {
    throw new Error("Failed to link generation to user message");
  }

  return { generationRow, userMessageRow: updatedMessage };
}

export async function createProjectGeneration(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  input: CreateProjectGenerationBody,
) {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }

  await getWorkspaceProject(actorUserId, workspaceId, projectId);
  await assertInputAssets(workspaceId, projectId, input.inputAssetIds);

  const generation = await insertQueuedProjectGeneration({
    workspaceId,
    projectId,
    createdBy: actorUserId,
    prompt: input.prompt,
    inputAssetIds: input.inputAssetIds,
    aspectRatio: input.aspectRatio,
  });

  return mapGenerationWithOutputs(generation);
}

export async function getProjectGeneration(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  generationId: string,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  const [row] = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.id, generationId),
        eq(generations.workspaceId, workspaceId),
        eq(generations.projectId, projectId),
        isNull(generations.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new GenerationNotFoundError();
  }

  return mapGenerationWithOutputs(row);
}

export async function runGenerationJob(generationId: string) {
  const [row] = await db
    .select()
    .from(generations)
    .where(
      and(eq(generations.id, generationId), isNull(generations.deletedAt)),
    )
    .limit(1);

  if (!row) {
    throw new GenerationNotFoundError();
  }

  if (row.status === "completed" || row.status === "cancelled") {
    return mapGenerationWithOutputs(row);
  }

  const fail = async (message: string, errorCode = "generation_failed") => {
    const [failed] = await db
      .update(generations)
      .set({
        status: "failed",
        errorCode,
        errorMessage: message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generationId))
      .returning();

    await recordGenerationEvent(generationId, "failed", message);

    if (!failed) {
      throw new Error("Failed to mark generation as failed");
    }

    return mapGenerationWithOutputs(failed);
  };

  if (!isStorageConfigured()) {
    return fail("File storage is not configured", "storage_not_configured");
  }

  if (!hasXaiApiKey()) {
    return fail("Image generation is not configured", "image_not_configured");
  }

  if (!row.projectId) {
    return fail("Generation is missing a project", "invalid_generation");
  }

  const startedAt = new Date();

  await db
    .update(generations)
    .set({
      status: "processing",
      startedAt,
      updatedAt: startedAt,
      errorCode: null,
      errorMessage: null,
    })
    .where(eq(generations.id, generationId));

  await recordGenerationEvent(generationId, "processing", "Generation started");

  try {
    const referenceImageUrls = await loadReferenceImageUrls(
      row.workspaceId,
      row.projectId,
      row.inputAssetIds,
    );

    const image = await generateProjectImage({
      prompt: row.prompt,
      aspectRatio: row.aspectRatio ?? undefined,
      model: row.model,
      referenceImageUrls,
    });

    const bucket = storageEnv.bucket;
    if (!bucket) {
      return fail("File storage is not configured", "storage_not_configured");
    }

    const { buffer, contentType } = image;

    const s3Key = buildGeneratedAssetKey(
      row.workspaceId,
      generationId,
      contentType,
    );

    await putObjectBuffer({
      key: s3Key,
      contentType,
      body: buffer,
    });

    const assetName = normalizeWorkspaceAssetDisplayNameOrDefault(
      row.prompt.slice(0, 80),
    );

    await db.transaction(async (tx) => {
      const [asset] = await tx
        .insert(assets)
        .values({
          scope: "workspace",
          workspaceId: row.workspaceId,
          primaryProjectId: row.projectId,
          name: assetName,
          type: "generated",
          category: "other",
          visibility: "project",
          mimeType: contentType,
          sizeBytes: buffer.byteLength,
          s3Bucket: bucket,
          s3Key,
          createdBy: row.createdBy,
          metadata: {
            generationId,
            revisedPrompt: image.revisedPrompt ?? null,
          },
        })
        .returning({ id: assets.id });

      if (!asset) {
        throw new Error("Failed to create generated asset");
      }

      await tx.insert(projectAssets).values({
        projectId: row.projectId!,
        assetId: asset.id,
      });

      const completedAt = new Date();

      await tx
        .update(generations)
        .set({
          status: "completed",
          outputAssetIds: [asset.id],
          providerRequestId: null,
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(generations.id, generationId));

      await tx.insert(generationEvents).values({
        generationId,
        status: "completed",
        message: "Generation completed",
      });
    });

    const [completed] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!completed) {
      throw new GenerationNotFoundError();
    }

    return mapGenerationWithOutputs(completed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed unexpectedly";
    return fail(message);
  }
}

export { ProjectNotFoundError };
