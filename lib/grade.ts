import { STATIC_PROPER_NOUNS } from "@/data/proper-nouns";
import { extractProperNounAnnotations } from "./annotations";
import { getHskEntry, getHskLevel, type HskLevel } from "./hsk";
import { chineseTokens, type Token } from "./segment";

export type Verdict =
  | "KNOWN"
  | "TARGET"
  | "TOO_HARD"
  | "BEYOND_HSK"
  | "PROPER_NOUN";

export type GradedWord = {
  token: Token;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  hskLevel: HskLevel | null;
  verdict: Verdict;
  isProperNoun: boolean;
};

export type GradeOptions = {
  knownSet: Set<string>;
  targetLevel: HskLevel;
};

// 的/了/着/过/地/得 — suffixes that bleed across word boundaries and produce
// junk tokens like 复杂的 or 完成了 that the segmenter kept together but
// aren't real dictionary entries. If the token isn't in HSK, ends in one of
// these, and the prefix IS in HSK, we treat the token as leakage and drop it.
const GRAMMAR_PARTICLES = new Set(["的", "了", "着", "过", "地", "得"]);

function isGrammarLeakage(hanzi: string): boolean {
  if (hanzi.length < 2) return false;
  const last = hanzi[hanzi.length - 1];
  if (!GRAMMAR_PARTICLES.has(last)) return false;
  if (getHskEntry(hanzi) !== null) return false; // real HSK compound, keep
  const prefix = hanzi.slice(0, -1);
  return getHskLevel(prefix) !== null;
}

function classify(
  hanzi: string,
  opts: GradeOptions,
  properNouns: Record<string, string>,
): { verdict: Verdict; properGloss: string | null } {
  if (opts.knownSet.has(hanzi)) return { verdict: "KNOWN", properGloss: null };
  const nounGloss = properNouns[hanzi];
  if (nounGloss !== undefined)
    return { verdict: "PROPER_NOUN", properGloss: nounGloss };
  const level = getHskLevel(hanzi);
  if (level === null) return { verdict: "BEYOND_HSK", properGloss: null };
  if (level <= opts.targetLevel) return { verdict: "KNOWN", properGloss: null };
  if (level <= opts.targetLevel + 1)
    return { verdict: "TARGET", properGloss: null };
  return { verdict: "TOO_HARD", properGloss: null };
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
  const dynamicNouns = extractProperNounAnnotations(text);
  const properNouns = { ...STATIC_PROPER_NOUNS, ...dynamicNouns };
  const tokens = chineseTokens(text, dynamicNouns);

  const graded: GradedWord[] = [];
  for (const token of tokens) {
    if (isGrammarLeakage(token.word)) continue;
    const { verdict, properGloss } = classify(token.word, opts, properNouns);
    const entry = getHskEntry(token.word);
    graded.push({
      token,
      hanzi: token.word,
      pinyin: entry?.pinyin ?? null,
      gloss: properGloss ?? entry?.translations?.[0] ?? null,
      hskLevel: entry?.level ?? null,
      verdict,
      isProperNoun: verdict === "PROPER_NOUN",
    });
  }

  const counts: Record<Verdict, number> = {
    KNOWN: 0,
    TARGET: 0,
    TOO_HARD: 0,
    BEYOND_HSK: 0,
    PROPER_NOUN: 0,
  };
  const seen = new Set<string>();
  const uniqueCounts: Record<Verdict, number> = {
    KNOWN: 0,
    TARGET: 0,
    TOO_HARD: 0,
    BEYOND_HSK: 0,
    PROPER_NOUN: 0,
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
    tokens: graded.map((g) => g.token),
    graded,
    counts,
    uniqueCounts,
    totalChineseTokens: graded.length,
    uniqueChineseWords: seen.size,
  };
}
