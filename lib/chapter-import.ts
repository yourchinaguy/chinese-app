// Shared chapter-text parsing + per-chapter sentence lookup. Used by both
// the rechunk script (CLI) and the chapter-import server action.

import { readFileSync } from "node:fs";
import path from "node:path";
import { splitSentences } from "./sentences";

export type Chapter = {
  idx: number;
  title: string;
  text: string;
  sentences: string[];
};

const HEADER = /^==\s*(\d+)\.\s*(.+?)\s*==\s*$/;

// Lines that look like textbook boilerplate, not chapter content. We drop
// these before sentence-splitting so example sentences don't end up showing
// the book's running title or citation list.
const NOISE_PATTERNS: RegExp[] = [
  // Book series title in the page header / footer (this exact textbook).
  /成功之道[：:]\s*中级商务汉语案例教程/,
  // Standalone "课文" (lesson) label.
  /^\s*课文\s*$/,
  // Standalone "课" (often appears as a vertical-text fragment).
  /^\s*课\s*$/,
  // Section dividers / vertical-strip OCR junk: short lines with no real content.
  /^\s*[a-zA-Z]{1,4}\s*$/,
  // Page numbers (1–3 digit lines).
  /^\s*\d{1,3}\s*$/,
];

// Traditional-only characters: their simplified equivalents differ. Any
// line containing one is leakage from a facing-page traditional column we
// don't want in the simplified-Chinese chapter text.
const TRADITIONAL_ONLY = new Set(
  // Common high-frequency trad chars whose simplified form is different.
  "個們還這為時問國當經過關業體義驗偉徵學處證風嗎間產傳專圍樹飛龍點該讓應廠從爭條認設計數導給開難氣寫變現實對於說進會東車書話頁節種電題裡裏麼劃觀論踐務環樂談聽親見許話讀識藝興運動類資資儀飯鋼義習豐義權題義態勢腦師質麗節長興夢圖養貝買賣記講識議書臺話訓認線級組總統聯滿溫業義紀經傳資進處號儀識營".split(""),
);
function hasTraditionalOnly(line: string): boolean {
  for (const ch of line) if (TRADITIONAL_ONLY.has(ch)) return true;
  return false;
}

// Marker lines that signal the end of body content for the chapter — once
// we hit any of these, the rest of the chapter (citations, references) is
// dropped. The text after these markers is metadata, not example content.
const BODY_END_MARKERS: RegExp[] = [
  /^资料来源[：:]/,
  /^資料來源[：:]/,
  /^资料來源[：:]/,
  /^参考资料[：:]/,
  /^references?\s*[:：]/i,
];

function cleanChapterBody(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (BODY_END_MARKERS.some((re) => re.test(trimmed))) break;
    if (NOISE_PATTERNS.some((re) => re.test(trimmed))) continue;
    if (hasTraditionalOnly(trimmed)) continue;
    kept.push(line);
  }
  return kept.join("\n");
}

export function parseChapters(raw: string): Chapter[] {
  const lines = raw.split(/\r?\n/);
  const out: Chapter[] = [];
  let cur: Chapter | null = null;
  for (const line of lines) {
    const m = line.match(HEADER);
    if (m) {
      if (cur) out.push(cur);
      cur = {
        idx: Number(m[1]),
        title: m[2].trim(),
        text: "",
        sentences: [],
      };
    } else if (cur) {
      cur.text += line + "\n";
    }
  }
  if (cur) out.push(cur);
  out.sort((a, b) => a.idx - b.idx);
  for (const c of out) {
    c.text = cleanChapterBody(c.text);
    c.sentences = splitSentences(c.text);
  }
  return out;
}

export function loadChaptersFromPath(relPath: string): Chapter[] {
  const abs = path.isAbsolute(relPath)
    ? relPath
    : path.join(process.cwd(), relPath);
  const raw = readFileSync(abs, "utf8");
  return parseChapters(raw);
}

// Pick the most context-rich sentence containing the hanzi: not a fragment,
// not the longest run-on. We prefer a "full" sentence — one that ends with
// a Chinese terminator — and break ties by length (longer = more context).
const TERMINATED = /[。！？；.!?]$/;

export function pickExampleSentence(
  sentences: string[],
  hanzi: string,
): string | null {
  const candidates = sentences.filter((s) => s.includes(hanzi));
  if (candidates.length === 0) return null;
  // Prefer terminated sentences first (full thoughts), then by length.
  const terminated = candidates.filter((s) => TERMINATED.test(s));
  const pool = terminated.length > 0 ? terminated : candidates;
  let best = pool[0];
  for (const s of pool) {
    if (s.length > best.length) best = s;
  }
  return best;
}

export type ChapterAssignment = {
  chapterIdx: number | null;
  chapterTitle: string | null;
  sentence: string | null;
};

export function assignToChapter(
  chapters: Chapter[],
  hanzi: string,
): ChapterAssignment {
  for (const c of chapters) {
    if (c.text.includes(hanzi)) {
      return {
        chapterIdx: c.idx,
        chapterTitle: c.title,
        sentence: pickExampleSentence(c.sentences, hanzi),
      };
    }
  }
  return { chapterIdx: null, chapterTitle: null, sentence: null };
}
