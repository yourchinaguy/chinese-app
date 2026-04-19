import { getHskEntry, getHskLevel, type HskLevel } from "./hsk";
import { chineseTokens, type Token } from "./segment";

export type Verdict = "KNOWN" | "TARGET" | "TOO_HARD" | "BEYOND_HSK";

export type GradedWord = {
  token: Token;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  hskLevel: HskLevel | null;
  verdict: Verdict;
};

export type GradeOptions = {
  knownSet: Set<string>;
  targetLevel: HskLevel;
};

function classify(hanzi: string, opts: GradeOptions): Verdict {
  if (opts.knownSet.has(hanzi)) return "KNOWN";
  const level = getHskLevel(hanzi);
  if (level === null) return "BEYOND_HSK";
  if (level <= opts.targetLevel) return "KNOWN";
  if (level <= opts.targetLevel + 1) return "TARGET";
  return "TOO_HARD";
}

export type GradeResult = {
  text: string;
  tokens: Token[];
  graded: GradedWord[];
  counts: Record<Verdict, number>;
  uniqueCounts: Record<Verdict, number>;
  totalChineseTokens: number;
  uniqueChineseWords: number;
};

export function gradeText(text: string, opts: GradeOptions): GradeResult {
  const tokens = chineseTokens(text);
  const graded: GradedWord[] = tokens.map((token) => {
    const entry = getHskEntry(token.word);
    const verdict = classify(token.word, opts);
    return {
      token,
      hanzi: token.word,
      pinyin: entry?.pinyin ?? null,
      gloss: entry?.translations?.[0] ?? null,
      hskLevel: entry?.level ?? null,
      verdict,
    };
  });

  const counts: Record<Verdict, number> = {
    KNOWN: 0,
    TARGET: 0,
    TOO_HARD: 0,
    BEYOND_HSK: 0,
  };
  const seen = new Set<string>();
  const uniqueCounts: Record<Verdict, number> = {
    KNOWN: 0,
    TARGET: 0,
    TOO_HARD: 0,
    BEYOND_HSK: 0,
  };
  for (const g of graded) {
    counts[g.verdict]++;
    if (!seen.has(g.hanzi)) {
      seen.add(g.hanzi);
      uniqueCounts[g.verdict]++;
    }
  }

  return {
    text,
    tokens,
    graded,
    counts,
    uniqueCounts,
    totalChineseTokens: tokens.length,
    uniqueChineseWords: seen.size,
  };
}
