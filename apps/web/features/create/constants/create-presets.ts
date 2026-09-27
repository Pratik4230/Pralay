import type { CreateChatModelId } from "@/features/create/types/create-ui";

export const CREATE_CHAT_MODELS: Array<{
  id: CreateChatModelId;
  label: string;
  description: string;
}> = [
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    description: "Default chat for Create and tool calls",
  },
];

export const CREATE_QUICK_SUGGESTIONS = [
  {
    label: "YouTube thumbnail",
    prompt:
      "Create a YouTube thumbnail for this project with bold title text, cinematic lighting, and the attached references.",
  },
  {
    label: "Instagram post",
    prompt:
      "Create a square Instagram post with clean typography and product focus using project assets.",
  },
  {
    label: "App icon",
    prompt:
      "Create a minimal app icon with strong silhouette and brand colors from our references.",
  },
  {
    label: "Product ad",
    prompt:
      "Create a product ad creative with hero product shot and short headline.",
  },
  {
    label: "Event poster",
    prompt:
      "Create an event poster with date, venue, and team photo composition.",
  },
] as const;
