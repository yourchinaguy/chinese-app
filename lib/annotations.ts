// Extracts "汉字 (English gloss)" annotations from source text. The simplify
// prompt instructs Claude to annotate first-occurrence proper nouns this way,
// so imported simplified text arrives with free name→English hints we can
// feed straight into the proper-noun pipeline.

const ANNOTATION_RE = /([\u4e00-\u9fff]{1,8})\s*[（(]\s*([^）)]{1,60}?)\s*[）)]/g;

export function extractProperNounAnnotations(
  text: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ANNOTATION_RE.lastIndex = 0;
  while ((m = ANNOTATION_RE.exec(text)) !== null) {
    const hanzi = m[1];
    const gloss = m[2].trim();
    // Only keep if the gloss contains Latin letters — i.e. an English/pinyin
    // label. Avoids matching Chinese-in-parens rhetorical flourishes.
    if (/[A-Za-z]/.test(gloss)) {
      out[hanzi] ??= gloss;
    }
  }
  return out;
}
