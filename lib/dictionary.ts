// Server-only dictionary that layers CC-CEDICT on top of the HSK 1–6 list.
// HSK is consulted first (richer / curated translations); for words beyond
// HSK we fall back to CC-CEDICT (~120k entries, covers nearly all modern
// written Chinese including business, tech, and news vocabulary).
//
// CC-CEDICT data lives in data/cedict.json (~9 MB). It is loaded lazily via
// fs.readFileSync the first time a lookup is performed, so the file is never
// pulled into a client bundle even if a module that imports this file ends
// up in a shared chunk. Do NOT import this module from "use client" code.

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanTranslations, getHskEntry } from "./hsk";

export type DictionaryEntry = {
  hanzi: string;
  pinyin: string | null;
  glosses: string[];
  source: "hsk" | "cedict" | null;
  hskLevel: number | null;
};

type CedictRow = [string | null, string]; // [pinyin, "gloss; gloss; ..."]
type CedictMap = Record<string, CedictRow>;

let cedictCache: CedictMap | null = null;

function loadCedict(): CedictMap {
  if (cedictCache) return cedictCache;
  const file = path.join(process.cwd(), "data", "cedict.json");
  const raw = readFileSync(file, "utf8");
  cedictCache = JSON.parse(raw) as CedictMap;
  return cedictCache;
}

function splitCedictGlosses(combined: string): string[] {
  return combined
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function lookup(hanzi: string): DictionaryEntry {
  const hskEntry = getHskEntry(hanzi);
  if (hskEntry) {
    return {
      hanzi,
      pinyin: hskEntry.pinyin,
      glosses: cleanTranslations(hskEntry),
      source: "hsk",
      hskLevel: hskEntry.level,
    };
  }
  const map = loadCedict();
  const row = map[hanzi];
  if (row) {
    return {
      hanzi,
      pinyin: row[0],
      glosses: splitCedictGlosses(row[1]),
      source: "cedict",
      hskLevel: null,
    };
  }
  return { hanzi, pinyin: null, glosses: [], source: null, hskLevel: null };
}

// Convenience: a single combined gloss string for storage in cards.gloss.
// We keep multiple meanings separated by "; " so the UI can split them
// back out if it wants a numbered list.
export function lookupForCard(
  hanzi: string,
): { pinyin: string | null; gloss: string | null; hskLevel: number | null } {
  const e = lookup(hanzi);
  return {
    pinyin: e.pinyin,
    gloss: e.glosses.length > 0 ? e.glosses.join("; ") : null,
    hskLevel: e.hskLevel,
  };
}
