// Auto-import a text file as vocab + grammar decks. Used by the inbox
// workflow: Claude Code extracts Chinese text from photos, writes it to
// inbox/<name>/extracted.md, then invokes this script to create decks
// without the user touching the UI.
//
// Usage:
//   npm run import-text -- <path> [--title="My Title"] [--kind=article|podcast|other]
//
// Defaults:
// - title: derived from parent folder name (inbox/foo/extracted.md → "foo")
// - kind:  "article"
// - target HSK level: 4 (matches the app's default; the UI slider is
//   only meaningful interactively)
// - word selection: all TARGET + PROPER_NOUN (same as the Analyze-then-
//   Create default)
// - grammar selection: every detected point

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { autoSelectFromText, importTextAsDecks } from "../lib/import-core";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let filePath: string | null = null;
  let title: string | null = null;
  let kind: "article" | "podcast" | "other" = "article";
  for (const a of args) {
    if (a.startsWith("--title=")) title = a.slice("--title=".length);
    else if (a.startsWith("--kind=")) {
      const k = a.slice("--kind=".length);
      if (k === "article" || k === "podcast" || k === "other") kind = k;
    } else if (!a.startsWith("--")) filePath = a;
  }
  return { filePath, title, kind };
}

function humanizeFolderName(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const { filePath, title: titleFlag, kind } = parseArgs(process.argv);
  if (!filePath) {
    console.error('usage: import-text <path> [--title="..."] [--kind=article|podcast|other]');
    process.exit(1);
  }

  const abs = path.resolve(filePath);
  const text = readFileSync(abs, "utf8").trim();
  if (!text) {
    console.error(`file is empty: ${abs}`);
    process.exit(1);
  }

  const title =
    titleFlag?.trim() ||
    humanizeFolderName(path.basename(path.dirname(abs))) ||
    path.basename(abs, path.extname(abs));

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set (use --env-file=.env.local)");
    process.exit(1);
  }
  const client = createClient({ url, authToken });

  const knownRows = await client.execute("SELECT hanzi FROM known_words");
  const knownSet = new Set(knownRows.rows.map((r) => String(r.hanzi)));

  const { selectedHanzi, selectedGrammarPointIds } = autoSelectFromText(
    text,
    knownSet,
  );

  if (selectedHanzi.length === 0 && selectedGrammarPointIds.length === 0) {
    console.error(
      "no target words or grammar points detected — either the text is already all known, or the grading needs a lower HSK target. Try /import interactively for now.",
    );
    process.exit(1);
  }

  const result = await importTextAsDecks(
    client,
    {
      title,
      kind,
      text,
      selectedHanzi,
      selectedGrammarPointIds,
    },
    knownSet,
  );

  console.log(`\nImported from: ${abs}`);
  console.log(`Source id:     ${result.sourceId}`);
  for (const d of result.decks) {
    console.log(`  ${d.type.padEnd(7)} deck #${d.id}  "${d.name}"  ·  ${d.cards} cards`);
  }
  console.log("\nOpen /decks in the app to review.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
