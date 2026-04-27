// Sentence splitter. Lone newlines are treated as whitespace inside a
// sentence — OCR and PDF copy-paste routinely line-wrap mid-sentence, and
// splitting on \n produced fragment "sentences" like 越本土化了。 instead
// of the full surrounding sentence.
const SENTENCE_SPLIT = /([。！？；]+|[.!?](?:\s+|$))/g;

export function splitSentences(text: string): string[] {
  // Collapse line wraps into spaces so wrapped sentences re-join.
  const flat = text.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
  const parts = flat.split(SENTENCE_SPLIT);
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
