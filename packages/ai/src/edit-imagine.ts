import { GROK_IMAGINE_MODEL } from "./constants.js";

const XAI_EDITS_URL = "https://api.x.ai/v1/images/edits";

/** Multi-reference editing (up to 5 URLs per xAI docs). */
export const GROK_IMAGINE_EDIT_MODEL = "grok-imagine-image-2.0";

export type ImagineEditInput = {
  prompt: string;
  referenceImageUrls: string[];
  aspectRatio?: string;
  apiKey: string;
  model?: string;
};

export type ImagineEditResult = {
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

export async function editImagineWithReferences(
  input: ImagineEditInput,
): Promise<ImagineEditResult> {
  const urls = input.referenceImageUrls.filter(Boolean).slice(0, 5);
  if (urls.length === 0) {
    throw new Error("editImagineWithReferences requires at least one image URL");
  }

  const model = input.model ?? GROK_IMAGINE_EDIT_MODEL;

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    images: urls.map((url) => ({ url })),
  };

  if (input.aspectRatio) {
    body.aspect_ratio = input.aspectRatio;
  }

  const response = await fetch(XAI_EDITS_URL, {
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
      `xAI image edit failed (${response.status})`;
    throw new Error(message);
  }

  const url = payload.data?.[0]?.url;
  if (!url) {
    throw new Error("xAI image edit returned no image URL");
  }

  return {
    url,
    revisedPrompt: payload.data?.[0]?.revised_prompt,
    model,
  };
}

export { GROK_IMAGINE_MODEL };
