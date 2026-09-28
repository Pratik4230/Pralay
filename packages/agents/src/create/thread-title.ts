import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { getOpenAiApiKey } from "@repo/env";
import { CREATE_THREAD_TITLE_MODEL_ID } from "@repo/validators";

const MAX_TITLE_LENGTH = 120;

export async function generateCreateThreadTitle(
  userPrompt: string,
): Promise<string> {
  const trimmed = userPrompt.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "New conversation";
  }

  const model = new ChatOpenAI({
    apiKey: getOpenAiApiKey(),
    model: CREATE_THREAD_TITLE_MODEL_ID,
    maxTokens: 32,
  });

  const response = await model.invoke([
    new SystemMessage(
      "Write a very short chat thread title (3 to 8 words) summarizing the user's creative request. No quotes. No punctuation at the end.",
    ),
    new HumanMessage(trimmed.slice(0, 500)),
  ]);

  const text =
    typeof response.content === "string"
      ? response.content
      : response.content
          .map((part) => ("text" in part ? part.text : ""))
          .join("")
          .trim();

  const title = text.replace(/^["']|["']$/g, "").trim();
  if (!title) {
    return trimmed.length <= MAX_TITLE_LENGTH
      ? trimmed
      : `${trimmed.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
  }

  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }

  return `${title.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
}
