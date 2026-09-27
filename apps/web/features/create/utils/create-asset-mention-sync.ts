export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whether `text` contains a standalone `@name` mention for this asset. */
export function textIncludesAssetMention(text: string, name: string) {
  if (!name) return false;
  const pattern = new RegExp(`@${escapeRegExp(name)}(?=\\s|$)`);
  return pattern.test(text);
}

export function removeAssetMentionFromText(text: string, name: string) {
  if (!name) return text;
  const pattern = new RegExp(`@${escapeRegExp(name)}\\s?`, "g");
  return text.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
}
