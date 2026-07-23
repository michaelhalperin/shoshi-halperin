/** Split long prose into readable paragraphs (newlines, then sentence pairs). */
export function descriptionParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const byLine = trimmed
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;

  if (trimmed.length > 160) {
    const sentences = trimmed.match(/[^.!?…]+(?:[.!?…]+|$)/g);
    if (sentences && sentences.length > 1) {
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(
          sentences
            .slice(i, i + 2)
            .join("")
            .trim()
        );
      }
      return paragraphs.filter(Boolean);
    }
  }

  return [trimmed];
}
