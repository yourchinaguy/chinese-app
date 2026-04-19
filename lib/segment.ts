import { Segment, useDefault } from "segmentit";

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

export function isChineseWord(s: string): boolean {
  return CJK_RE.test(s);
}

export function segment(text: string): Token[] {
  const raw = getSegmenter().doSegment(text);
  const tokens: Token[] = [];
  let cursor = 0;
  for (const { w } of raw) {
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

export function chineseTokens(text: string): Token[] {
  return segment(text).filter((t) => t.isChinese);
}
