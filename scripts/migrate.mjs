import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  console.error("Run with: node --env-file=.env.local scripts/migrate.mjs");
  process.exit(1);
}

const db = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS known_words (
    hanzi TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_id INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (source_id) REFERENCES sources(id)
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    hanzi TEXT NOT NULL,
    pinyin TEXT,
    gloss TEXT,
    hsk_level INTEGER,
    example_sentence TEXT,
    box INTEGER NOT NULL DEFAULT 1,
    due_at INTEGER NOT NULL,
    last_reviewed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_at)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    got_it INTEGER NOT NULL,
    reviewed_at INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id)`,
  `CREATE TABLE IF NOT EXISTS cloze_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    sentence TEXT NOT NULL,
    answer TEXT NOT NULL,
    blank_start INTEGER NOT NULL,
    blank_end INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  )`,
];

for (const sql of statements) {
  const firstLine = sql.trim().split("\n")[0];
  process.stdout.write(`→ ${firstLine} ... `);
  await db.execute(sql);
  process.stdout.write("ok\n");
}

// Post-schema migrations. Each ALTER runs once; on subsequent migrate runs
// the 'duplicate column' error is ignored.
const alters = [
  `ALTER TABLE decks ADD COLUMN deck_type TEXT NOT NULL DEFAULT 'vocab'`,
  `ALTER TABLE cards ADD COLUMN grammar_point_id TEXT`,
  `ALTER TABLE cards ADD COLUMN matched_text TEXT`,
  `ALTER TABLE sources ADD COLUMN original_text TEXT`,
];

for (const sql of alters) {
  const firstLine = sql.trim().split("\n")[0];
  process.stdout.write(`→ ${firstLine} ... `);
  try {
    await db.execute(sql);
    process.stdout.write("ok\n");
  } catch (e) {
    if (String(e?.message ?? e).includes("duplicate column")) {
      process.stdout.write("already present\n");
    } else {
      throw e;
    }
  }
}

console.log("\nMigrations complete.");
