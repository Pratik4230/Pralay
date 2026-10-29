import { GROK_IMAGINE_MODEL } from "./constants.js";
import {
  ImageGenerationError,
  isRetryableHttpStatus,
  parseRetryAfterMs,
} from "./image-generation-error.js";

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
  const urls = input.referenceImageUrls.filter(Boolean);
  if (urls.length === 0) {
    throw new Error(
      "editImagineWithReferences requires at least one image URL",
    );
  }
  if (urls.length > 5) {
    throw new Error(
      "editImagineWithReferences supports at most five image URLs",
    );
  }

  const model = input.model ?? GROK_IMAGINE_EDIT_MODEL;

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    images: urls.map((url) => ({ type: "image_url", url })),
  };

  if (input.aspectRatio) {
    body.aspect_ratio = input.aspectRatio;
  }

  let response: Response;
  try {
    response = await fetch(XAI_EDITS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ImageGenerationError("Could not reach xAI image editing", {
      code: "provider_request_failed",
      retryable: true,
      cause: error,
    });
  }

  const payload = (await response.json().catch(() => ({}))) as XaiImageResponse;

  if (!response.ok) {
    const message =
      payload.error?.message ?? `xAI image edit failed (${response.status})`;
    throw new ImageGenerationError(message, {
      code: "provider_request_failed",
      retryable: isRetryableHttpStatus(response.status),
      status: response.status,
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
    });
  }

  const url = payload.data?.[0]?.url;
  if (!url) {
    throw new ImageGenerationError("xAI image edit returned no image URL", {
      code: "provider_response_invalid",
      retryable: true,
    });
  }

  return {
    url,
    revisedPrompt: payload.data?.[0]?.revised_prompt,
    model,
  };
}

export { GROK_IMAGINE_MODEL };
