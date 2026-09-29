import { getOpenAiApiKey } from "@repo/env";

type ResponsesPayload = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function extractResponseText(payload: ResponsesPayload): string {
  const chunks: string[] = [];
  for (const item of payload.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text?.trim()) {
        chunks.push(part.text.trim());
      }
    }
  }
  return chunks.join("\n\n").trim();
}

/** OpenAI built-in web search via the Responses API. */
export async function runOpenAiWebSearch(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) {
    return "Query was empty.";
  }

  const apiKey = getOpenAiApiKey();

  const attempt = async (toolType: string) => {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        tools: [{ type: toolType }],
        input: trimmed,
      }),
    });
    const payload = (await response.json()) as ResponsesPayload;
    return { response, payload };
  };

  let { response, payload } = await attempt("web_search");
  if (!response.ok) {
    ({ response, payload } = await attempt("web_search_preview"));
  }

  if (!response.ok) {
    const message =
      payload.error?.message ??
      `OpenAI web search failed (${response.status})`;
    throw new Error(message);
  }

  const text = extractResponseText(payload);
  if (!text) {
    return "Web search returned no summary.";
  }

  return text;
}
