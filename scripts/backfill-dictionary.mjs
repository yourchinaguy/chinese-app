// One-shot script: fill in pinyin/gloss/hsk_level on existing cards using
// the layered dictionary (HSK first, CC-CEDICT fallback). Targets vocab
// cards where pinyin or gloss is NULL — typically BEYOND_HSK words imported
// before CC-CEDICT was wired in.
//
// Run after `node scripts/build-cedict.mjs` has produced data/cedict.json.
//   node --env-file=.env.local scripts/backfill-dictionary.mjs

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const cedictPath = path.join(process.cwd(), "data", "cedict.json");
const hskPath = path.join(process.cwd(), "data", "hsk.json");
if (!existsSync(cedictPath)) {
  console.error(`Missing ${cedictPath}. Run scripts/build-cedict.mjs first.`);
  process.exit(1);
}

const cedict = JSON.parse(readFileSync(cedictPath, "utf8"));
const hskRaw = JSON.parse(readFileSync(hskPath, "utf8"));

// Build an HSK lookup: hanzi → { pinyin, translations: string[], level }.
const hskByHanzi = new Map();
for (const e of hskRaw) {
  if (!e.hanzi || !e.level) continue;
  hskByHanzi.set(e.hanzi, e);
}

function lookup(hanzi) {
  const h = hskByHanzi.get(hanzi);
  if (h) {
    const translations = Array.isArray(h.translations)
      ? h.translations
      : typeof h.gloss === "string"
        ? [h.gloss]
        : [];
    return {
      pinyin: h.pinyin ?? null,
      gloss: translations.length > 0 ? translations.join("; ") : null,
      hskLevel: h.level,
    };
  }
  const c = cedict[hanzi];
  if (c) {
    return { pinyin: c[0] ?? null, gloss: c[1] ?? null, hskLevel: null };
  }
  return { pinyin: null, gloss: null, hskLevel: null };
}

const db = createClient({ url, authToken });

// Only target vocab-style cards (no grammar_point_id). Looking for any card
// with at least one missing field that we might be able to fill.
const r = await db.execute(
  `SELECT id, hanzi, pinyin, gloss, hsk_level FROM cards
   WHERE grammar_point_id IS NULL
     AND (pinyin IS NULL OR gloss IS NULL OR hsk_level IS NULL)`,
);

console.log(`Candidates: ${r.rows.length}`);
let updated = 0;
let stillMissing = 0;
let bySource = { hsk: 0, cedict: 0 };

for (const row of r.rows) {
  const hanzi = String(row.hanzi);
  const fb = lookup(hanzi);
  const nextPinyin = row.pinyin ?? fb.pinyin;
  const nextGloss = row.gloss ?? fb.gloss;
  const nextLevel = row.hsk_level ?? fb.hskLevel;

  const changed =
    nextPinyin !== row.pinyin ||
    nextGloss !== row.gloss ||
    nextLevel !== row.hsk_level;
  if (!changed) {
    if (!nextGloss) stillMissing++;
    continue;
  }
  await db.execute({
    sql: `UPDATE cards SET pinyin = ?, gloss = ?, hsk_level = ? WHERE id = ?`,
    args: [nextPinyin, nextGloss, nextLevel, Number(row.id)],
  });
  updated++;
  if (hskByHanzi.has(hanzi)) bySource.hsk++;
  else if (cedict[hanzi]) bySource.cedict++;
}

console.log(
  `Updated ${updated} cards (${bySource.hsk} from HSK, ${bySource.cedict} from CEDICT).`,
);
console.log(`Still missing gloss: ${stillMissing} cards.`);
