// Pinyin tone-number → tone-mark normalizer. Both inputs and the canonical
// app format are accepted: passing already-tone-marked pinyin returns it
// unchanged. Imports from textbook PDFs / Pleco / Anki decks often arrive
// with numbers (zhong1 guo2 hua4 or zhongguo1hua4), so we sanitize at
// insert time and via a one-time DB migration for legacy rows.
//
// Handles:
// - Standard syllables: zhong1 → zhōng
// - Compact tokens with internal tone digits: bei3jing1 → běijīng,
//   guo2min2sheng1chan3 → guómín shēngchǎn
// - 'v' shortcut: lv4 → lǜ
// - 'lue'/'nue' shortcut: lue1 → lüē, nue4 → nüè
// - Mixed case: Shang1ye4 → Shāngyè
// - Tone placement: a > o > e > last of {i,u,ü}
// - Neutral tones (5/0): digit stripped, no mark

const TONES: Record<string, Record<string, string>> = {
  "1": { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū", "ü": "ǖ" },
  "2": { a: "á", e: "é", i: "í", o: "ó", u: "ú", "ü": "ǘ" },
  "3": { a: "ǎ", e: "ě", i: "ǐ", o: "ǒ", u: "ǔ", "ü": "ǚ" },
  "4": { a: "à", e: "è", i: "ì", o: "ò", u: "ù", "ü": "ǜ" },
};

function convertSyllable(syl: string): string {
  const m = syl.match(/^([a-zA-Zü]+?)([0-5])$/);
  if (!m) return syl;
  let core = m[1];
  const tone = m[2];

  core = core.replace(/v/g, "ü").replace(/V/g, "Ü");
  core = core.replace(/^([lnLN])ue/, (_, x) => x + "üe");

  if (tone === "5" || tone === "0") return core;
  const map = TONES[tone];
  if (!map) return core;

  const lower = core.toLowerCase();
  let targetIdx: number;
  if (lower.includes("a")) targetIdx = lower.indexOf("a");
  else if (lower.includes("o")) targetIdx = lower.indexOf("o");
  else if (lower.includes("e")) targetIdx = lower.indexOf("e");
  else
    targetIdx = Math.max(
      lower.lastIndexOf("i"),
      lower.lastIndexOf("u"),
      lower.lastIndexOf("ü"),
    );
  if (targetIdx < 0) return core;

  const ch = core[targetIdx].toLowerCase();
  const replaced = map[ch] ?? core[targetIdx];
  const wasUpper =
    core[targetIdx] === core[targetIdx].toUpperCase() &&
    /[A-Z]/.test(core[targetIdx]);
  const finalChar = wasUpper ? replaced.toUpperCase() : replaced;
  return core.slice(0, targetIdx) + finalChar + core.slice(targetIdx + 1);
}

function convertToken(token: string): string {
  const matches = [...token.matchAll(/[a-zA-Züv]+[0-5]/g)];
  if (matches.length === 0) return convertSyllable(token);
  let out = "";
  let pos = 0;
  for (const m of matches) {
    out += token.slice(pos, m.index!) + convertSyllable(m[0]);
    pos = m.index! + m[0].length;
  }
  out += token.slice(pos);
  return out;
}

export function toToneMarks(pinyin: string | null | undefined): string | null {
  if (!pinyin) return pinyin ?? null;
  return pinyin
    .split(/(\s+)/)
    .map((t) => (/^\s+$/.test(t) ? t : convertToken(t)))
    .join("");
}
