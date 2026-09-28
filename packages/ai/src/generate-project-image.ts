import { GROK_IMAGINE_MODEL, GROK_IMAGINE_PROVIDER } from "./constants.js";
import { downloadBinary } from "./download.js";
import { generateImagineImage } from "./imagine.js";
import { getXaiApiKey, hasXaiApiKey } from "@repo/env";

export type ProjectImageGenerateInput = {
  prompt: string;
  aspectRatio?: string;
  model?: string | null;
};

export type ProjectImageGenerateResult = {
  buffer: Buffer;
  contentType: string;
  provider: string;
  model: string;
  revisedPrompt?: string;
};

export function resolveImageGenerationDefaults(): {
  provider: typeof GROK_IMAGINE_PROVIDER;
  model: string;
} {
  return { provider: GROK_IMAGINE_PROVIDER, model: GROK_IMAGINE_MODEL };
}

export async function generateProjectImage(
  input: ProjectImageGenerateInput,
): Promise<ProjectImageGenerateResult> {
  if (!hasXaiApiKey()) {
    throw new Error("Missing required environment variable: XAI_API_KEY");
  }

  const apiKey = getXaiApiKey();
  const model = input.model ?? GROK_IMAGINE_MODEL;
  const imagine = await generateImagineImage({
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    apiKey,
    model,
  });

  const { buffer, contentType } = await downloadBinary(imagine.url);

  return {
    buffer,
    contentType,
    provider: GROK_IMAGINE_PROVIDER,
    model: imagine.model,
    revisedPrompt: imagine.revisedPrompt,
  };
}
