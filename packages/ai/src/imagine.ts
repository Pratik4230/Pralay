import { GROK_IMAGINE_MODEL } from "./constants.js";

export type ImagineGenerateInput = {
  prompt: string;
  aspectRatio?: string;
  apiKey: string;
  model?: string;
};

export type ImagineGenerateResult = {
  url: string;
  revisedPrompt?: string;
  model: string;
};

type XaiImageResponse = {
  data?: Array<{
    url?: string;
    revised_prompt?: string;
  }>;
  error?: { message?: string };
};

export async function generateImagineImage(
  input: ImagineGenerateInput,
): Promise<ImagineGenerateResult> {
  const model = input.model ?? GROK_IMAGINE_MODEL;

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
  };

  if (input.aspectRatio) {
    body.aspect_ratio = input.aspectRatio;
  }

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as XaiImageResponse;

  if (!response.ok) {
    const message =
      payload.error?.message ??
      `xAI image generation failed (${response.status})`;
    throw new Error(message);
  }

  const url = payload.data?.[0]?.url;
  if (!url) {
    throw new Error("xAI image generation returned no image URL");
  }

  return {
    url,
    revisedPrompt: payload.data?.[0]?.revised_prompt,
    model,
  };
}
