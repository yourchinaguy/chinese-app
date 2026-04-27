// Client-safe helpers for rendering glosses + character breakdowns. Pure
// string ops + HSK lookups — no CC-CEDICT here (that lives server-side).

import { cleanTranslations, getHskEntry, type HskEntry } from "./hsk";

const HANZI = /[一-鿿]/u;

// Whole-gloss patterns that signal a CC-CEDICT metadata entry the learner
// doesn't need (cross-references, classifier listings, alt pronunciations,
// "see X" pointers, etymological cruft).
const META_GLOSS_PREFIXES = [
  "cl:",
  "variant of",
  "old variant of",
  "see ",
  "see also",
  "abbr.",
  "abbr ",
  "taiwan pr.",
  "erhua variant",
  "used in ",
  "(bound form)",
];

const HANZI_RUN = /[一-鿿|]/u;

// Strip square-bracket annotations (pinyin cross-refs, alt readings) and
// run "; " separators inside a single gloss — CEDICT sometimes packs
// sub-meanings in one slash-segment. Returns the cleaned gloss or "" if
// nothing useful remained.
// Stub fragments that remain after stripping cross-refs — e.g. "used in"
// with nothing after, or trailing connectives. These add no information.
const STUB_GLOSS = /^(used in|see|see also|variant|of|the|a|an|to)\s*$/i;

function cleanOne(gloss: string): string {
  let g = gloss
    // Drop bracketed pinyin/cross-refs: "[ti1 ji5]", "[gè]"
    .replace(/\s*\[[^\]]*\]/g, "")
    // Drop "(used correlatively with X)" parenthetical asides — long, rare
    .replace(/\s*\(used [^)]*\)/gi, "")
    // Drop standalone hanzi cross-refs like "體己|体己" left over after
    // bracket stripping
    .replace(/[一-鿿]+\|[一-鿿]+/g, "")
    // Collapse whitespace runs
    .replace(/\s+/g, " ")
    .trim();
  // Drop a trailing semicolon-separated fragment that's now empty
  g = g.replace(/[;,]\s*$/, "").trim();
  // Drop sentence stems that lost their object during cleaning
  if (STUB_GLOSS.test(g)) return "";
  return g;
}

function isMetaGloss(g: string): boolean {
  const lower = g.toLowerCase();
  for (const p of META_GLOSS_PREFIXES) {
    if (lower.startsWith(p)) return true;
  }
  // Pure-hanzi fragments (e.g. "個|个") add no English info
  if (g.length > 0 && [...g].every((ch) => HANZI_RUN.test(ch))) return true;
  return false;
}

// CC-CEDICT-style merged gloss strings use "; " as the primary separator.
// Older imports may use " / ". Strip metadata noise (classifier markers,
// variant cross-refs, bracket annotations) so the learner sees plain
// English meanings.
export function splitCombinedGloss(s: string | null): string[] {
  if (!s) return [];
  const primary = s.split(/\s*;\s*/).map((g) => g.trim()).filter(Boolean);
  const fallback =
    primary.length > 1
      ? primary
      : s.split(/\s+\/\s+/).map((g) => g.trim()).filter(Boolean);
  return fallback
    .map(cleanOne)
    .filter((g) => g.length > 0 && !isMetaGloss(g));
}

export type CharBreakdown = {
  char: string;
  entry: HskEntry | null;
  glosses: string[];
};

// Split a multi-character compound into per-character breakdowns. Returns
// an empty array for single characters or anything without Chinese
// characters. Useful when the compound's own gloss is sparse and the
// learner benefits from seeing the parts.
export function characterBreakdown(hanzi: string): CharBreakdown[] {
  if (!hanzi || hanzi.length < 2) return [];
  const out: CharBreakdown[] = [];
  for (const ch of Array.from(hanzi)) {
    if (!HANZI.test(ch)) continue;
    const entry = getHskEntry(ch);
    out.push({
      char: ch,
      entry,
      glosses: cleanTranslations(entry),
    });
  }
  return out.length >= 2 ? out : [];
}
