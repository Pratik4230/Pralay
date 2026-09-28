import { inngest } from "../client.js";
import { runGenerationJob } from "../../features/generations/services/project-generations.service.js";

export const runGeneration = inngest.createFunction(
  { id: "run-generation", triggers: [{ event: "pralay/generation.requested" }] },
  async ({ event, step }) => {
    const generationId = event.data.generationId;
    if (typeof generationId !== "string" || generationId.length === 0) {
      throw new Error("Missing generationId on pralay/generation.requested");
    }

    return step.run("run-generation-job", () =>
      runGenerationJob(generationId),
    );
  },
);
