const SENTENCE_SPLIT = /([。！？；\n]+|[.!?](?:\s+|$))/g;

export function splitSentences(text: string): string[] {
  const parts = text.split(SENTENCE_SPLIT);
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i];
    const terminator = parts[i + 1] ?? "";
    const s = (body + terminator).trim();
    if (s.length > 0) sentences.push(s);
  }
  return sentences;
}

export function findExampleSentence(
  text: string,
  hanzi: string,
): string | null {
  const sentences = splitSentences(text);
  for (const s of sentences) {
    if (s.includes(hanzi)) return s;
  }
  return null;
}
