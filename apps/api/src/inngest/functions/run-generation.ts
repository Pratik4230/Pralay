import { NonRetriableError, RetryAfterError } from "inngest";

import { inngest } from "../client.js";
import { classifyGenerationJobError } from "../../features/generations/services/generation-job-errors.js";
import {
  GenerationNotFoundError,
  markGenerationFailed,
  runGenerationJob,
} from "../../features/generations/services/project-generations.service.js";

export const runGeneration = inngest.createFunction(
  {
    id: "run-generation",
    triggers: [{ event: "pralay/generation.requested" }],
    retries: 4,
    singleton: { key: "event.data.generationId", mode: "skip" },
    onFailure: async ({ event, error, step }) => {
      const originalEvent = event.data.event as {
        data?: { generationId?: unknown };
      };
      const generationId = originalEvent.data?.generationId;
      if (typeof generationId !== "string" || generationId.length === 0) {
        return;
      }

      await step.run("mark-generation-failed", async () => {
        try {
          await markGenerationFailed(generationId, {
            eventMessage: error.message,
          });
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

    try {
      return await step.run("run-generation-job", () =>
        runGenerationJob(generationId, { attempt }),
      );
    } catch (error) {
      const jobError = classifyGenerationJobError(error);
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
