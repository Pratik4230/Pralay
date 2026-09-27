type CreateComposerMentionHighlightProps = {
  text: string;
};

const MENTION_PATTERN = /(@[^\s@]+)/g;

export function splitComposerTextWithMentions(text: string): string[] {
  if (!text) return [];
  return text.split(MENTION_PATTERN).filter((part) => part.length > 0);
}

/**
 * Highlight layer only — same font weight/size as the textarea so the caret lines up.
 */
export function CreateComposerMentionHighlight({
  text,
}: CreateComposerMentionHighlightProps) {
  const parts = splitComposerTextWithMentions(text);

  if (parts.length === 0) {
    return <span className="text-foreground">{"\u00a0"}</span>;
  }

  return (
    <>
      {parts.map((part, index) => (
        <span
          key={`${index}-${part}`}
          className={
            part.startsWith("@")
              ? "text-primary"
              : "text-foreground"
          }
        >
          {part}
        </span>
      ))}
    </>
  );
}
