import type { Client } from "@libsql/client";
import { getStarterArticle } from "@/data/starter";
import { lookupForCard } from "./dictionary";
import { gradeText } from "./grade";
import { detectGrammarPoints } from "./grammar";
import { type HskLevel } from "./hsk";
import { toToneMarks } from "./pinyin";
import { findExampleSentence } from "./sentences";
import { initialState } from "./srs";

export type ImportKind = "article" | "podcast" | "other";

export type ImportInput = {
  title: string;
  kind: ImportKind;
  text: string;
  selectedHanzi: string[];
  selectedGrammarPointIds: string[];
  fromStarterSlug?: string | null;
  targetLevel?: HskLevel;
};

export type ImportedDeck = {
  id: number;
  type: "vocab" | "grammar";
  name: string;
  cards: number;
};

export type ImportResult = {
  sourceId: number;
  decks: ImportedDeck[];
};

// Shared core used by both the server action (interactive UI selection)
// and the CLI script (inbox auto-import from Claude Code).
export async function importTextAsDecks(
  client: Client,
  input: ImportInput,
  knownSet: Set<string>,
): Promise<ImportResult> {
  const {
    title,
    kind,
    text,
    selectedHanzi,
    selectedGrammarPointIds,
    fromStarterSlug,
    targetLevel = 4,
  } = input;

  if (!title.trim() || !text.trim()) {
    throw new Error("title and text are required");
  }
  if (selectedHanzi.length === 0 && selectedGrammarPointIds.length === 0) {
    throw new Error("select at least one word or grammar point");
  }

  const now = Math.floor(Date.now() / 1000);
  const cleanTitle = title.trim();

  const originalText = fromStarterSlug
    ? (getStarterArticle(fromStarterSlug)?.text ?? null)
    : null;

  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, original_text, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
    args: [cleanTitle, kind, text, originalText, now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  const decks: ImportedDeck[] = [];

  if (selectedHanzi.length > 0) {
    const grade = gradeText(text, { knownSet, targetLevel });
    const byHanzi = new Map<string, (typeof grade.graded)[number]>();
    for (const g of grade.graded) {
      if (!byHanzi.has(g.hanzi)) byHanzi.set(g.hanzi, g);
    }

    const deckResult = await client.execute({
      sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'vocab', ?) RETURNING id",
      args: [cleanTitle, sourceId, now],
    });
    const deckId = Number(deckResult.rows[0].id);

    const srs = initialState();
    let inserted = 0;
    for (const hanzi of selectedHanzi) {
      const g = byHanzi.get(hanzi);
      const example = findExampleSentence(text, hanzi);
      // Grade gives us HSK data; for beyond-HSK words it returns nulls.
      // Fall back to CC-CEDICT so cards always have pinyin + gloss when
      // the dictionary has anything to say about the word.
      let pinyin = toToneMarks(g?.pinyin) ?? null;
      let gloss = g?.gloss ?? null;
      let hskLevel: number | null = g?.hskLevel ?? null;
      if (!pinyin || !gloss) {
        const fb = lookupForCard(hanzi);
        if (!pinyin) pinyin = fb.pinyin;
        if (!gloss) gloss = fb.gloss;
        if (hskLevel === null) hskLevel = fb.hskLevel;
      }
      await client.execute({
        sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                  box, due_at, last_reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          deckId,
          hanzi,
          pinyin,
          gloss,
          hskLevel,
          example,
          srs.box,
          srs.due_at,
          srs.last_reviewed_at,
          now,
        ],
      });
      inserted++;
    }
    decks.push({ id: deckId, type: "vocab", name: cleanTitle, cards: inserted });
  }

  if (selectedGrammarPointIds.length > 0) {
    const grammar = detectGrammarPoints(text);
    const grammarById = new Map(grammar.map((g) => [g.pointId, g]));

    const grammarName = `${cleanTitle} — grammar`;
    const deckResult = await client.execute({
      sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'grammar', ?) RETURNING id",
      args: [grammarName, sourceId, now],
    });
    const deckId = Number(deckResult.rows[0].id);

    const srs = initialState();
    let inserted = 0;
    for (const pointId of selectedGrammarPointIds) {
      const match = grammarById.get(pointId);
      if (!match) continue;
      await client.execute({
        sql: `INSERT INTO cards (deck_id, hanzi, grammar_point_id, matched_text, example_sentence,
                                  box, due_at, last_reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          deckId,
          pointId,
          pointId,
          match.matchedText,
          match.sentence,
          srs.box,
          srs.due_at,
          srs.last_reviewed_at,
          now,
        ],
      });
      inserted++;
    }
    decks.push({ id: deckId, type: "grammar", name: grammarName, cards: inserted });
  }

  return { sourceId, decks };
}

// Convenience: auto-pick the same defaults the UI pre-selects. Used by the
// CLI script so `npm run import-text` produces the same shape of decks
// you'd get by clicking Analyze and Create without tweaking selections.
export function autoSelectFromText(
  text: string,
  knownSet: Set<string>,
  targetLevel: HskLevel = 4,
): {
  selectedHanzi: string[];
  selectedGrammarPointIds: string[];
} {
  const grammar = detectGrammarPoints(text);
  const skipTokens = new Set(grammar.flatMap((m) => m.connectives));
  const grade = gradeText(text, { knownSet, targetLevel, skipTokens });

  const seen = new Set<string>();
  const selectedHanzi: string[] = [];
  for (const g of grade.graded) {
    if (seen.has(g.hanzi)) continue;
    seen.add(g.hanzi);
    if (g.verdict === "TARGET" || g.verdict === "PROPER_NOUN") {
      selectedHanzi.push(g.hanzi);
    }
  }
  return {
    selectedHanzi,
    selectedGrammarPointIds: grammar.map((m) => m.pointId),
  };
}
