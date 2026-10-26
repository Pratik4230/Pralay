import { and, eq, isNull, or, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { generateProjectImage, resolveImageGenerationDefaults } from "@repo/ai";
import { db } from "@repo/db";
import {
  assets,
  assistantMessages,
  generationEvents,
  generations,
  projectAssets,
} from "@repo/db/schema";
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
import {
  classifyGenerationJobError,
  GenerationJobError,
} from "./generation-job-errors.js";

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

export class InvalidGenerationReferenceCountError extends Error {
  constructor() {
    super("At most five unique reference images are supported");
    this.name = "InvalidGenerationReferenceCountError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

export class GenerationNotRetryableError extends Error {
  constructor() {
    super("Only failed generations can be retried");
    this.name = "GenerationNotRetryableError";
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
    retryCount: row.retryCount,
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

export type AssistantMessageGenerationSummary = {
  id: string;
  status: GenerationRow["status"];
  prompt: string;
  errorMessage: string | null;
  outputAssets: OutputAssetPreview[];
};

/** Batch load generation summaries for assistant thread messages. */
export async function loadAssistantMessageGenerationSummaries(
  generationIds: string[],
): Promise<Map<string, AssistantMessageGenerationSummary>> {
  const uniqueIds = [...new Set(generationIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(generations)
    .where(
      and(inArray(generations.id, uniqueIds), isNull(generations.deletedAt)),
    );

  const allOutputIds = rows.flatMap((row) => row.outputAssetIds);
  const previewRows = await loadOutputAssetPreviews(allOutputIds);
  const previewById = new Map(previewRows.map((row) => [row.id, row]));

  const result = new Map<string, AssistantMessageGenerationSummary>();

  for (const row of rows) {
    const outputAssets = row.outputAssetIds
      .map((id) => previewById.get(id))
      .filter((asset): asset is OutputAssetPreview => Boolean(asset));

    result.set(row.id, {
      id: row.id,
      status: row.status,
      prompt: row.prompt,
      errorMessage: row.errorMessage,
      outputAssets,
    });
  }

  return result;
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
  if (
    inputAssetIds.length > 5 ||
    new Set(inputAssetIds).size !== inputAssetIds.length
  ) {
    throw new InvalidGenerationReferenceCountError();
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
        inArray(assets.id, inputAssetIds),
        eq(assets.workspaceId, workspaceId),
        isNull(assets.deletedAt),
      ),
    );

  const order = new Map(inputAssetIds.map((id, index) => [id, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

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

  return urls;
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
  referenceRoles?: Record<string, string>;
  type?: GenerationRow["type"];
};

export async function insertQueuedProjectGeneration(
  input: InsertProjectGenerationInput,
) {
  if (
    input.inputAssetIds.length > 5 ||
    new Set(input.inputAssetIds).size !== input.inputAssetIds.length
  ) {
    throw new InvalidGenerationReferenceCountError();
  }
  const inputAssetIds = input.inputAssetIds;
  const referenceRoles = Object.fromEntries(
    Object.entries(input.referenceRoles ?? {}).filter(([assetId]) =>
      inputAssetIds.includes(assetId),
    ),
  );
  const { provider, model } = resolveImageGenerationDefaults();

  const generation = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(generations)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        createdBy: input.createdBy,
        type: input.type ?? "generate",
        status: "queued",
        prompt: input.prompt,
        inputAssetIds,
        aspectRatio: input.aspectRatio ?? null,
        referenceRoles,
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

  try {
    await inngest.send({
      id: `generation:${generation.id}:initial`,
      name: "pralay/generation.requested",
      data: { generationId: generation.id },
    });
    return generation;
  } catch (error) {
    const [failed] = await db
      .update(generations)
      .set({
        status: "failed",
        errorCode: "generation_enqueue_failed",
        errorMessage: "The generation could not be queued. Please try again.",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generation.id))
      .returning();
    await recordGenerationEvent(
      generation.id,
      "failed",
      error instanceof Error ? error.message : "Failed to enqueue generation",
    );
    return failed ?? generation;
  }
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
  referenceRoles?: Record<string, string>;
  type?: GenerationRow["type"];
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
    referenceRoles: input.referenceRoles,
    type: input.type,
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

export async function retryProjectGeneration(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  generationId: string,
) {
  await getWorkspaceProject(actorUserId, workspaceId, projectId);

  const now = new Date();
  const [queued] = await db
    .update(generations)
    .set({
      status: "queued",
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(generations.id, generationId),
        eq(generations.workspaceId, workspaceId),
        eq(generations.projectId, projectId),
        eq(generations.status, "failed"),
        isNull(generations.deletedAt),
      ),
    )
    .returning();

  if (!queued) {
    const [existing] = await db
      .select({ id: generations.id })
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
    if (!existing) throw new GenerationNotFoundError();
    throw new GenerationNotRetryableError();
  }

  await recordGenerationEvent(
    generationId,
    "queued",
    "Generation queued for retry",
  );

  try {
    await inngest.send({
      id: `generation:${generationId}:manual:${randomUUID()}`,
      name: "pralay/generation.requested",
      data: { generationId },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to enqueue generation";
    await markGenerationFailed(generationId, {
      code: "generation_failed",
      message: "The generation could not be queued. Please try again.",
      eventMessage: message,
    });
    throw error;
  }

  return mapGenerationWithOutputs(queued);
}

async function recordGenerationAttemptFailure(
  generationId: string,
  attemptNumber: number,
  error: GenerationJobError,
) {
  await db
    .update(generations)
    .set({
      errorCode: error.code,
      errorMessage: error.userMessage,
      updatedAt: new Date(),
    })
    .where(eq(generations.id, generationId));

  const suffix = error.retryable ? " Retry scheduled." : "";
  await recordGenerationEvent(
    generationId,
    "processing",
    `Attempt ${attemptNumber} failed.${suffix}`,
  );
}

export async function markGenerationFailed(
  generationId: string,
  fallback?: { code?: string; message?: string; eventMessage?: string },
) {
  const [current] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (!current) throw new GenerationNotFoundError();
  if (current.status === "completed" || current.status === "cancelled") {
    return mapGenerationWithOutputs(current);
  }

  const message =
    current.errorMessage ?? fallback?.message ?? "Image generation failed.";
  const [failed] = await db
    .update(generations)
    .set({
      status: "failed",
      errorCode: current.errorCode ?? fallback?.code ?? "generation_failed",
      errorMessage: message,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(generations.id, generationId))
    .returning();

  if (!failed) throw new Error("Failed to mark generation as failed");

  await recordGenerationEvent(
    generationId,
    "failed",
    fallback?.eventMessage ?? message,
  );
  return mapGenerationWithOutputs(failed);
}

export async function runGenerationJob(
  generationId: string,
  options: { attempt?: number } = {},
) {
  const [row] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, generationId), isNull(generations.deletedAt)))
    .limit(1);

  if (!row) {
    throw new GenerationNotFoundError();
  }

  if (row.status === "completed" || row.status === "cancelled") {
    return mapGenerationWithOutputs(row);
  }

  const attempt = Math.max(0, options.attempt ?? 0);
  const startedAt = new Date();

  const [processing] = await db
    .update(generations)
    .set({
      status: "processing",
      startedAt: row.startedAt ?? startedAt,
      updatedAt: startedAt,
      errorCode: null,
      errorMessage: null,
      ...(attempt > 0
        ? {
            retryCount: sql`greatest(${generations.retryCount}, ${attempt})`,
          }
        : {}),
    })
    .where(eq(generations.id, generationId))
    .returning();

  const attemptNumber = (processing?.retryCount ?? row.retryCount) + 1;
  await recordGenerationEvent(
    generationId,
    "processing",
    `Generation attempt ${attemptNumber} started`,
  );

  try {
    if (!isStorageConfigured()) {
      throw new StorageNotConfiguredError();
    }

    if (!hasXaiApiKey()) {
      throw new Error("Missing required environment variable: XAI_API_KEY");
    }

    if (!row.projectId) {
      throw new GenerationJobError("Generation is missing a project", {
        code: "generation_invalid_input",
        retryable: false,
        userMessage: "Generation is missing a project.",
      });
    }

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
      throw new StorageNotConfiguredError();
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
    const jobError = classifyGenerationJobError(error);
    await recordGenerationAttemptFailure(generationId, attemptNumber, jobError);
    throw jobError;
  }
}

export { ProjectNotFoundError };
