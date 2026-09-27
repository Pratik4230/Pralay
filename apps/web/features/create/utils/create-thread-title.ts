const MAX_TITLE_LENGTH = 48;

export function deriveThreadTitleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "New conversation";
  }
  if (cleaned.length <= MAX_TITLE_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
}
