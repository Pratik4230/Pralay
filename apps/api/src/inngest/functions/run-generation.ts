import { NonRetriableError, RetryAfterError } from "inngest";

import { inngest } from "../client.js";
import { generationChannel } from "../channels.js";
import { classifyGenerationJobError } from "../../features/generations/services/generation-job-errors.js";
import {
  getGenerationForRealtime,
  GenerationNotFoundError,
  markGenerationFailed,
  markGenerationProcessing,
  runGenerationJob,
} from "../../features/generations/services/project-generations.service.js";

type GenerationRealtimePayload = Awaited<
  ReturnType<typeof getGenerationForRealtime>
>;

async function publishGenerationStatus(
  generationId: string,
  generation: GenerationRealtimePayload,
) {
  try {
    await inngest.realtime.publish(generationChannel(generationId).status, {
      generation,
    });
  } catch {
    // Postgres is authoritative. Clients reconcile once when they reconnect.
  }
}

export const runGeneration = inngest.createFunction(
  {
    id: "run-generation",
    triggers: [{ event: "pralay/generation.requested" }],
    retries: 4,
    singleton: { key: "event.data.generationId", mode: "skip" },
    onFailure: async ({ event, step }) => {
      const originalEvent = event.data.event as {
        data?: { generationId?: unknown };
      };
      const generationId = originalEvent.data?.generationId;
      if (typeof generationId !== "string" || generationId.length === 0) {
        return;
      }

      await step.run("mark-generation-failed", async () => {
        try {
          const failed = await markGenerationFailed(generationId, {
            eventMessage: "Generation failed after all attempts.",
          });
          await publishGenerationStatus(generationId, failed);
          return failed;
        } catch (failureError) {
          if (failureError instanceof GenerationNotFoundError) return;
          throw failureError;
        }
      });
    },
  },
  async ({ event, step, attempt }) => {
    const generationId = event.data.generationId;
    if (typeof generationId !== "string" || generationId.length === 0) {
      throw new NonRetriableError(
        "Missing generationId on pralay/generation.requested",
      );
    }

    const processing = await step.run(
      `mark-generation-processing-${attempt}`,
      async () => {
        const next = await markGenerationProcessing(generationId, attempt);
        await publishGenerationStatus(generationId, next);
        return next;
      },
    );
    if (
      processing.status === "completed" ||
      processing.status === "cancelled"
    ) {
      return processing;
    }

    try {
      return await step.run("run-generation-job", async () => {
        const completed = await runGenerationJob(generationId, {
          attempt,
          processingPrepared: true,
        });
        await publishGenerationStatus(generationId, completed);
        return completed;
      });
    } catch (error) {
      const jobError = classifyGenerationJobError(error);
      await step.run(`load-generation-after-attempt-${attempt}`, async () => {
        const next = await getGenerationForRealtime(generationId);
        await publishGenerationStatus(generationId, next);
        return next;
      });
      if (!jobError.retryable) {
        throw new NonRetriableError(jobError.userMessage, {
          cause: jobError,
        });
      }
      if (jobError.retryAfterMs !== null) {
        throw new RetryAfterError(
          jobError.userMessage,
          Math.max(1_000, jobError.retryAfterMs),
          { cause: jobError },
        );
      }
      throw jobError;
    }
  },
);
