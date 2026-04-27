// Rechunk a vocab-pack source by chapter. Reads a chapter-tagged text file
// (`== N. Title ==` headers) and:
//   1. Parses chapters into [{ idx, title, text }].
//   2. Loads all existing decks + cards under the named source.
//   3. Assigns each card to the first chapter whose text contains its hanzi.
//      Cards with no match land in an "Unmatched" deck so nothing is lost.
//   4. Creates new chapter decks (or reuses existing ones), moves cards by
//      UPDATE deck_id (preserves SRS state, reviews, tests).
//   5. Fills example_sentence with the shortest sentence in the chapter
//      that contains the hanzi.
//   6. Deletes old chunked decks that end up empty.
//
// Usage:
//   npm run rechunk-by-chapter -- --source "<title>" --file <path>
//
// Reruns are safe — assignments + sentences are recomputed.

import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

const sourceTitle = arg("--source");
const filePath = arg("--file");
if (!sourceTitle || !filePath) {
  console.error('Usage: --source "<title>" --file <path>');
  process.exit(1);
}

const raw = readFileSync(filePath, "utf8");

// Boilerplate and noise filters (mirrors lib/chapter-import.ts).
const NOISE_PATTERNS = [
  /成功之道[：:]\s*中级商务汉语案例教程/,
  /^\s*课文\s*$/,
  /^\s*课\s*$/,
  /^\s*[a-zA-Z]{1,4}\s*$/,
  /^\s*\d{1,3}\s*$/,
];
const BODY_END_MARKERS = [
  /^资料来源[：:]/,
  /^資料來源[：:]/,
  /^参考资料[：:]/,
  /^references?\s*[:：]/i,
];
const TRADITIONAL_ONLY = new Set(
  "個們還這為時問國當經過關業體義驗偉徵學處證風嗎間產傳專圍樹飛龍點該讓應廠從爭條認設計數導給開難氣寫變現實對於說進會東車書話頁節種電題裡裏麼劃觀論踐務環樂談聽親見許話讀識藝興運動類資儀飯鋼義習豐權態勢腦師質麗節長夢圖養貝買賣記講議書臺訓線級組總統聯滿溫紀傳營".split(""),
);
function hasTraditionalOnly(line) {
  for (const ch of line) if (TRADITIONAL_ONLY.has(ch)) return true;
  return false;
}
function cleanChapterBody(raw) {
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (BODY_END_MARKERS.some((re) => re.test(trimmed))) break;
    if (NOISE_PATTERNS.some((re) => re.test(trimmed))) continue;
    if (hasTraditionalOnly(trimmed)) continue;
    out.push(line);
  }
  return out.join("\n");
}

// Parse chapter blocks. Header form: "== <idx>. <title> ==", anywhere on a
// line by itself (whitespace ok).
const HEADER = /^==\s*(\d+)\.\s*(.+?)\s*==\s*$/;
const lines = raw.split(/\r?\n/);
const chapters = [];
let cur = null;
for (const line of lines) {
  const m = line.match(HEADER);
  if (m) {
    if (cur) chapters.push(cur);
    cur = { idx: Number(m[1]), title: m[2].trim(), text: "" };
  } else if (cur) {
    cur.text += line + "\n";
  }
}
if (cur) chapters.push(cur);
chapters.sort((a, b) => a.idx - b.idx);
for (const c of chapters) c.text = cleanChapterBody(c.text);
console.log(`Parsed ${chapters.length} chapters:`);
for (const c of chapters) {
  console.log(`  Ch ${c.idx}: ${c.title} (${c.text.length} chars)`);
}
if (chapters.length === 0) {
  console.error("No chapters parsed — check header format `== N. Title ==`");
  process.exit(1);
}

// Sentence splitting (mirrors lib/sentences.ts). \n is treated as
// whitespace so OCR line-wraps don't fragment sentences.
const SENTENCE_SPLIT = /([。！？；]+|[.!?](?:\s+|$))/g;
function splitSentences(text) {
  const flat = text.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
  const parts = flat.split(SENTENCE_SPLIT);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i];
    const term = parts[i + 1] ?? "";
    const s = (body + term).trim();
    if (s.length > 0) out.push(s);
  }
  return out;
}
const TERMINATED_RE = /[。！？；.!?]$/;
function pickExampleSentence(text, hanzi) {
  const ss = splitSentences(text).filter((s) => s.includes(hanzi));
  if (ss.length === 0) return null;
  const terminated = ss.filter((s) => TERMINATED_RE.test(s));
  const pool = terminated.length > 0 ? terminated : ss;
  let best = pool[0];
  for (const s of pool) if (s.length > best.length) best = s;
  return best;
}

// Pre-split per chapter so we don't redo work per card.
for (const c of chapters) {
  c.sentences = splitSentences(c.text);
}

const db = createClient({ url, authToken });

const sources = await db.execute({
  sql: `SELECT id FROM sources WHERE title = ?`,
  args: [sourceTitle],
});
if (sources.rows.length === 0) {
  console.error(`No source found with title "${sourceTitle}"`);
  process.exit(1);
}
const sourceIds = sources.rows.map((r) => Number(r.id));
console.log(`Source ids: ${sourceIds.join(", ")}`);

const sp = sourceIds.map(() => "?").join(",");
const oldDecks = await db.execute({
  sql: `SELECT id, name FROM decks WHERE source_id IN (${sp})`,
  args: sourceIds,
});
const oldDeckIds = oldDecks.rows.map((r) => Number(r.id));
console.log(`Existing decks: ${oldDeckIds.length}`);
if (oldDeckIds.length === 0) {
  console.error("No decks to rechunk under this source.");
  process.exit(1);
}

const dp = oldDeckIds.map(() => "?").join(",");
const cards = await db.execute({
  sql: `SELECT id, hanzi FROM cards
        WHERE deck_id IN (${dp}) AND grammar_point_id IS NULL`,
  args: oldDeckIds,
});
console.log(`Cards under source: ${cards.rows.length}`);

// Assignment: hanzi → { chapter | "unmatched", sentence }.
// First chapter whose text contains the hanzi wins.
const assignment = new Map();
for (const r of cards.rows) {
  const hanzi = String(r.hanzi);
  if (assignment.has(hanzi)) continue; // dedupe across chunks
  let assigned = null;
  for (const c of chapters) {
    if (c.text.includes(hanzi)) {
      assigned = {
        chapterIdx: c.idx,
        chapterTitle: c.title,
        sentence: pickExampleSentence(c.text, hanzi),
      };
      break;
    }
  }
  assignment.set(
    hanzi,
    assigned ?? { chapterIdx: null, chapterTitle: null, sentence: null },
  );
}

// Stats.
const counts = new Map();
let unmatched = 0;
for (const a of assignment.values()) {
  if (a.chapterIdx === null) unmatched++;
  else counts.set(a.chapterIdx, (counts.get(a.chapterIdx) ?? 0) + 1);
}
console.log("\nAssignment:");
for (const c of chapters) {
  console.log(`  Ch ${c.idx} ${c.title}: ${counts.get(c.idx) ?? 0} cards`);
}
console.log(`  Unmatched: ${unmatched} cards`);

// Reuse a primary source row (the lowest id) for the rebuilt decks. The
// others end up empty and we drop them at the end.
const primarySourceId = Math.min(...sourceIds);
const now = Math.floor(Date.now() / 1000);
const totalChapters = chapters.length;

// Build/reuse chapter decks. Naming: "<source title> · Ch <idx>: <title>"
const chapterDeckIds = new Map();
for (const c of chapters) {
  const name = `${sourceTitle} · Ch ${c.idx}: ${c.title}`;
  // Look for an existing deck with this name under our source.
  const existing = await db.execute({
    sql: `SELECT id FROM decks WHERE name = ? AND source_id = ?`,
    args: [name, primarySourceId],
  });
  let deckId;
  if (existing.rows.length > 0) {
    deckId = Number(existing.rows[0].id);
    await db.execute({
      sql: `UPDATE decks SET chunk_index = ?, chunk_total = ? WHERE id = ?`,
      args: [c.idx, totalChapters, deckId],
    });
  } else {
    const ins = await db.execute({
      sql: `INSERT INTO decks (name, source_id, deck_type, chunk_index, chunk_total, created_at)
            VALUES (?, ?, 'vocab', ?, ?, ?) RETURNING id`,
      args: [name, primarySourceId, c.idx, totalChapters, now],
    });
    deckId = Number(ins.rows[0].id);
  }
  chapterDeckIds.set(c.idx, deckId);
}

// "Unmatched" deck (only if needed).
let unmatchedDeckId = null;
if (unmatched > 0) {
  const name = `${sourceTitle} · Unmatched`;
  const existing = await db.execute({
    sql: `SELECT id FROM decks WHERE name = ? AND source_id = ?`,
    args: [name, primarySourceId],
  });
  if (existing.rows.length > 0) {
    unmatchedDeckId = Number(existing.rows[0].id);
  } else {
    const ins = await db.execute({
      sql: `INSERT INTO decks (name, source_id, deck_type, chunk_index, chunk_total, created_at)
            VALUES (?, ?, 'vocab', NULL, NULL, ?) RETURNING id`,
      args: [name, primarySourceId, now],
    });
    unmatchedDeckId = Number(ins.rows[0].id);
  }
}

// Move every card to its target deck + set example_sentence.
let moved = 0;
for (const r of cards.rows) {
  const cardId = Number(r.id);
  const hanzi = String(r.hanzi);
  const a = assignment.get(hanzi);
  const targetDeckId =
    a.chapterIdx !== null
      ? chapterDeckIds.get(a.chapterIdx)
      : unmatchedDeckId;
  if (targetDeckId === undefined || targetDeckId === null) continue;
  await db.execute({
    sql: `UPDATE cards SET deck_id = ?, example_sentence = ? WHERE id = ?`,
    args: [targetDeckId, a.sentence, cardId],
  });
  moved++;
}
console.log(`\nMoved ${moved} cards.`);

// Delete old decks that are now empty (no cards reference them).
let deletedDecks = 0;
for (const id of oldDeckIds) {
  if (chapterDeckIds.size > 0) {
    if ([...chapterDeckIds.values()].includes(id)) continue;
  }
  if (id === unmatchedDeckId) continue;
  const c = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM cards WHERE deck_id = ?`,
    args: [id],
  });
  if (Number(c.rows[0].c) === 0) {
    await db.execute({ sql: `DELETE FROM decks WHERE id = ?`, args: [id] });
    deletedDecks++;
  }
}
console.log(`Deleted ${deletedDecks} empty old decks.`);

// Drop secondary source rows that no longer have any decks.
let droppedSources = 0;
for (const sid of sourceIds) {
  if (sid === primarySourceId) continue;
  const c = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM decks WHERE source_id = ?`,
    args: [sid],
  });
  if (Number(c.rows[0].c) === 0) {
    await db.execute({ sql: `DELETE FROM sources WHERE id = ?`, args: [sid] });
    droppedSources++;
  }
}
console.log(`Dropped ${droppedSources} orphan source rows.`);
console.log("\nDone.");
