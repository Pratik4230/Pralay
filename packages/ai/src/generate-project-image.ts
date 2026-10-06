import { GROK_IMAGINE_MODEL, GROK_IMAGINE_PROVIDER } from "./constants.js";
import { downloadBinary } from "./download.js";
import { editImagineWithReferences } from "./edit-imagine.js";
import { generateImagineImage } from "./imagine.js";
import { getXaiApiKey, hasXaiApiKey } from "@repo/env";

export type ProjectImageGenerateInput = {
  prompt: string;
  aspectRatio?: string;
  model?: string | null;
  /** Presigned HTTPS URLs for library reference images (max 5). */
  referenceImageUrls?: string[];
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
  const refs = (input.referenceImageUrls ?? []).filter(Boolean);
  if (refs.length > 5) {
    throw new Error("Image generation supports at most five reference images");
  }

  if (refs.length > 0) {
    const edit = await editImagineWithReferences({
      prompt: input.prompt,
      referenceImageUrls: refs,
      aspectRatio: input.aspectRatio,
      apiKey,
      model: input.model ?? undefined,
    });
    const { buffer, contentType } = await downloadBinary(edit.url);
    return {
      buffer,
      contentType,
      provider: GROK_IMAGINE_PROVIDER,
      model: edit.model,
      revisedPrompt: edit.revisedPrompt,
    };
  }

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
