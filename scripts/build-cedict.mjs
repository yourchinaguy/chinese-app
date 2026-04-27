// Parse CC-CEDICT into a compact server-side JSON dictionary keyed by
// simplified hanzi. Run once after downloading cedict_ts.u8.gz from MDBG.
//
// Output: data/cedict.json with shape
//   { "<simplified>": ["<pinyin tone-marked>", "<gloss; gloss; gloss>"], ... }
//
// Multiple CC-CEDICT entries with the same simplified form are merged: the
// first pinyin is kept and glosses are concatenated with "; " (deduped).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Inline a JS port of toToneMarks (we can't import the TS lib from a node
// script without setup). Mirrors lib/pinyin.ts.
const TONES = {
  "1": { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū", "ü": "ǖ" },
  "2": { a: "á", e: "é", i: "í", o: "ó", u: "ú", "ü": "ǘ" },
  "3": { a: "ǎ", e: "ě", i: "ǐ", o: "ǒ", u: "ǔ", "ü": "ǚ" },
  "4": { a: "à", e: "è", i: "ì", o: "ò", u: "ù", "ü": "ǜ" },
};

function convertSyllable(syl) {
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
  let targetIdx;
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

function toToneMarks(s) {
  if (!s) return null;
  return s
    .split(/(\s+)/)
    .map((t) => (/^\s+$/.test(t) ? t : convertSyllable(t)))
    .join("");
}

const inputPath = "/tmp/cedict.txt.gz";
if (!existsSync(inputPath)) {
  console.error(`Missing ${inputPath}. Download with:`);
  console.error(
    "  curl -L -o /tmp/cedict.txt.gz https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz",
  );
  process.exit(1);
}

const raw = gunzipSync(readFileSync(inputPath)).toString("utf8");
const lines = raw.split(/\r?\n/);

// Format per line:
//   traditional simplified [pinyin] /gloss1/gloss2/.../
const ENTRY = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/;

const out = {};
let parsed = 0;
let skipped = 0;

for (const line of lines) {
  if (!line || line.startsWith("#")) continue;
  const m = line.match(ENTRY);
  if (!m) {
    skipped++;
    continue;
  }
  const [, , simp, pinyinNumeric, glossesRaw] = m;
  const glosses = glossesRaw
    .split("/")
    .map((g) => g.trim())
    .filter(Boolean);
  if (glosses.length === 0) continue;

  const pinyin = toToneMarks(pinyinNumeric.trim());

  if (out[simp]) {
    // Merge — keep first pinyin, append unique glosses
    const existing = out[simp];
    const seen = new Set(existing[1].split("; ").map((g) => g.toLowerCase()));
    for (const g of glosses) {
      if (!seen.has(g.toLowerCase())) {
        existing[1] += "; " + g;
        seen.add(g.toLowerCase());
      }
    }
  } else {
    out[simp] = [pinyin, glosses.join("; ")];
  }
  parsed++;
}

const outPath = "data/cedict.json";
writeFileSync(outPath, JSON.stringify(out));
const size = readFileSync(outPath).byteLength;
console.log(
  `Wrote ${outPath}: ${Object.keys(out).length} entries, ${(size / 1024 / 1024).toFixed(2)} MB`,
);
console.log(`Parsed ${parsed} lines, skipped ${skipped}.`);
