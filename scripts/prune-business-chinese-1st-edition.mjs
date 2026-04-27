// One-shot cleanup: drop cards whose hanzi is in the existing Business
// Chinese decks but NOT in the trimmed 2nd-edition pack. Keeps any cards
// the user has already reviewed for vocabulary that survived the trim.
// Reviews + tests for removed cards are also deleted.

import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

// Re-parse the TS pack file by extracting the hanzi tokens. We don't need
// a full TS evaluator for this — every entry follows the same shape.
const packPath = path.join(process.cwd(), "data", "vocab-packs.ts");
const packSrc = readFileSync(packPath, "utf8");
const HANZI_RE = /hanzi:\s*"([^"]+)"/g;
const valid = new Set();
let m;
while ((m = HANZI_RE.exec(packSrc)) !== null) valid.add(m[1]);
console.log(`Pack now has ${valid.size} unique hanzi.`);

const db = createClient({ url, authToken });

// Find decks under the Business Chinese source(s).
const sources = await db.execute({
  sql: `SELECT id, title FROM sources WHERE title = ?`,
  args: ["成功之道：商务汉语案例教程"],
});
if (sources.rows.length === 0) {
  console.log("No matching source — nothing to prune.");
  process.exit(0);
}
const sourceIds = sources.rows.map((r) => Number(r.id));
console.log(`Sources: ${sourceIds.join(", ")}`);

const placeholders = sourceIds.map(() => "?").join(",");
const decks = await db.execute({
  sql: `SELECT id, name FROM decks WHERE source_id IN (${placeholders})`,
  args: sourceIds,
});
console.log(`Decks: ${decks.rows.length}`);

const deckIds = decks.rows.map((r) => Number(r.id));
if (deckIds.length === 0) {
  console.log("No decks — nothing to prune.");
  process.exit(0);
}

const deckPlaceholders = deckIds.map(() => "?").join(",");
const cards = await db.execute({
  sql: `SELECT id, hanzi FROM cards WHERE deck_id IN (${deckPlaceholders})
        AND grammar_point_id IS NULL`,
  args: deckIds,
});

const toDelete = cards.rows
  .filter((r) => !valid.has(String(r.hanzi)))
  .map((r) => Number(r.id));

console.log(`Total cards: ${cards.rows.length}`);
console.log(`Cards to remove (1st-edition-only): ${toDelete.length}`);
if (toDelete.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const idPlaceholders = toDelete.map(() => "?").join(",");
const reviewsRes = await db.execute({
  sql: `DELETE FROM reviews WHERE card_id IN (${idPlaceholders})`,
  args: toDelete,
});
console.log(`Deleted ${reviewsRes.rowsAffected} reviews.`);

const cardsRes = await db.execute({
  sql: `DELETE FROM cards WHERE id IN (${idPlaceholders})`,
  args: toDelete,
});
console.log(`Deleted ${cardsRes.rowsAffected} cards.`);
