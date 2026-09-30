export type ActiveComposerMention = {
  query: string;
  start: number;
  end: number;
};

/** Active `@` token at the text caret (not only at end of string). */
export function findActiveComposerMention(
  text: string,
  caretIndex: number,
): ActiveComposerMention | null {
  const safeCaret = Math.max(0, Math.min(caretIndex, text.length));
  const beforeCaret = text.slice(0, safeCaret);
  const match = beforeCaret.match(/@([^\s@]*)$/);
  if (!match) return null;

  const full = match[0];
  const query = match[1] ?? "";
  const start = beforeCaret.length - full.length;

  return { query, start, end: safeCaret };
}

export function replaceActiveComposerMention(
  text: string,
  mention: ActiveComposerMention,
  assetName: string,
): string {
  return `${text.slice(0, mention.start)}@${assetName} ${text.slice(mention.end)}`;
}

export function caretIndexAfterComposerMention(
  mention: ActiveComposerMention,
  assetName: string,
): number {
  return mention.start + `@${assetName} `.length;
}
