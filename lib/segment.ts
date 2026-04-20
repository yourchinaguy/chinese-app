import { Segment, useDefault } from "segmentit";
import { STATIC_PROPER_NOUNS } from "@/data/proper-nouns";

let segmenter: Segment | null = null;

function getSegmenter(): Segment {
  if (!segmenter) segmenter = useDefault(new Segment());
  return segmenter;
}

export type Token = {
  word: string;
  start: number;
  end: number;
  isChinese: boolean;
};

const CJK_RE = /^[\u4e00-\u9fff]+$/;
const MAX_MERGE_LEN = 4; // most proper nouns are 2–4 tokens wide

export function isChineseWord(s: string): boolean {
  return CJK_RE.test(s);
}

type RawToken = { w: string; p: number };

// After segmentit, merge adjacent tokens whose concatenation matches a known
// proper noun. Longest match wins so 字节跳动 beats 字节 + 跳动.
function mergeProperNouns(
  tokens: RawToken[],
  properNouns: Set<string>,
): RawToken[] {
  if (properNouns.size === 0) return tokens;
  const out: RawToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = 0;
    for (let len = Math.min(MAX_MERGE_LEN, tokens.length - i); len >= 2; len--) {
      const candidate = tokens
        .slice(i, i + len)
        .map((t) => t.w)
        .join("");
      if (properNouns.has(candidate)) {
        matched = len;
        break;
      }
    }
    if (matched > 0) {
      out.push({
        w: tokens
          .slice(i, i + matched)
          .map((t) => t.w)
          .join(""),
        p: 0,
      });
      i += matched;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

export function segment(
  text: string,
  extraProperNouns: Record<string, string> = {},
): Token[] {
  const raw = getSegmenter().doSegment(text);
  const nouns = new Set([
    ...Object.keys(STATIC_PROPER_NOUNS),
    ...Object.keys(extraProperNouns),
  ]);
  const merged = mergeProperNouns(raw, nouns);

  const tokens: Token[] = [];
  let cursor = 0;
  for (const { w } of merged) {
    const start = text.indexOf(w, cursor);
    const found = start >= 0 ? start : cursor;
    const end = found + w.length;
    tokens.push({
      word: w,
      start: found,
      end,
      isChinese: isChineseWord(w),
    });
    cursor = end;
  }
  return tokens;
}

export function chineseTokens(
  text: string,
  extraProperNouns: Record<string, string> = {},
): Token[] {
  return segment(text, extraProperNouns).filter((t) => t.isChinese);
}
