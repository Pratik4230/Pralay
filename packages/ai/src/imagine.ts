import { GROK_IMAGINE_MODEL } from "./constants.js";
import {
  ImageGenerationError,
  isRetryableHttpStatus,
  parseRetryAfterMs,
} from "./image-generation-error.js";

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

  let response: Response;
  try {
    response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ImageGenerationError("Could not reach xAI image generation", {
      code: "provider_request_failed",
      retryable: true,
      cause: error,
    });
  }

  const payload = (await response.json().catch(() => ({}))) as XaiImageResponse;

  if (!response.ok) {
    const message =
      payload.error?.message ??
      `xAI image generation failed (${response.status})`;
    throw new ImageGenerationError(message, {
      code: "provider_request_failed",
      retryable: isRetryableHttpStatus(response.status),
      status: response.status,
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
    });
  }

  const url = payload.data?.[0]?.url;
  if (!url) {
    throw new ImageGenerationError(
      "xAI image generation returned no image URL",
      {
        code: "provider_response_invalid",
        retryable: true,
      },
    );
  }

  return {
    url,
    revisedPrompt: payload.data?.[0]?.revised_prompt,
    model,
  };
}
