"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gradeText, type GradeResult } from "@/lib/grade";
import { detectGrammarPoints, type GrammarMatch } from "@/lib/grammar";
import type { HskLevel } from "@/lib/hsk";
import { findExampleSentence } from "@/lib/sentences";
import { initialState } from "@/lib/srs";

async function loadKnownSet(): Promise<Set<string>> {
  const r = await db().execute("SELECT hanzi FROM known_words");
  return new Set(r.rows.map((row) => String(row.hanzi)));
}

export type AnalyzeResult = GradeResult & { grammar: GrammarMatch[] };

export async function analyzeText(
  text: string,
  targetLevel: HskLevel,
): Promise<AnalyzeResult> {
  const knownSet = await loadKnownSet();
  const grammar = detectGrammarPoints(text);
  const skipTokens = new Set(grammar.flatMap((m) => m.connectives));
  const grade = gradeText(text, { knownSet, targetLevel, skipTokens });
  return { ...grade, grammar };
}

export type CreateDeckInput = {
  title: string;
  kind: "article" | "podcast" | "other";
  text: string;
  selectedHanzi: string[];
  selectedGrammarPointIds: string[];
};

export async function createDeck(input: CreateDeckInput): Promise<void> {
  const { title, kind, text, selectedHanzi, selectedGrammarPointIds } = input;
  if (!title.trim() || !text.trim()) {
    throw new Error("title and text are required");
  }
  if (selectedHanzi.length === 0 && selectedGrammarPointIds.length === 0) {
    throw new Error("select at least one word or grammar point");
  }

  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const cleanTitle = title.trim();

  // Single shared source row — both decks reference the same original text.
  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, ?, ?, ?) RETURNING id",
    args: [cleanTitle, kind, text, now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  const createdDeckIds: number[] = [];

  // --- Vocab deck ---
  if (selectedHanzi.length > 0) {
    const knownSet = await loadKnownSet();
    const grade = gradeText(text, { knownSet, targetLevel: 4 });
    const byHanzi = new Map<string, (typeof grade.graded)[number]>();
    for (const g of grade.graded) {
      if (!byHanzi.has(g.hanzi)) byHanzi.set(g.hanzi, g);
    }

    const deckResult = await client.execute({
      sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'vocab', ?) RETURNING id",
      args: [cleanTitle, sourceId, now],
    });
    const deckId = Number(deckResult.rows[0].id);
    createdDeckIds.push(deckId);

    const srs = initialState();
    for (const hanzi of selectedHanzi) {
      const g = byHanzi.get(hanzi);
      const example = findExampleSentence(text, hanzi);
      await client.execute({
        sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                  box, due_at, last_reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          deckId,
          hanzi,
          g?.pinyin ?? null,
          g?.gloss ?? null,
          g?.hskLevel ?? null,
          example,
          srs.box,
          srs.due_at,
          srs.last_reviewed_at,
          now,
        ],
      });
    }
  }

  // --- Grammar deck ---
  if (selectedGrammarPointIds.length > 0) {
    const grammar = detectGrammarPoints(text);
    const grammarById = new Map(grammar.map((g) => [g.pointId, g]));

    const deckResult = await client.execute({
      sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'grammar', ?) RETURNING id",
      args: [`${cleanTitle} — grammar`, sourceId, now],
    });
    const deckId = Number(deckResult.rows[0].id);
    createdDeckIds.push(deckId);

    const srs = initialState();
    for (const pointId of selectedGrammarPointIds) {
      const match = grammarById.get(pointId);
      if (!match) continue;
      await client.execute({
        sql: `INSERT INTO cards (deck_id, hanzi, grammar_point_id, matched_text, example_sentence,
                                  box, due_at, last_reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          deckId,
          pointId, // reuse hanzi column as the key — schema's hanzi is NOT NULL
          pointId,
          match.matchedText,
          match.sentence,
          srs.box,
          srs.due_at,
          srs.last_reviewed_at,
          now,
        ],
      });
    }
  }

  // If we made exactly one deck, go straight to it. If both, land on the list.
  if (createdDeckIds.length === 1) {
    redirect(`/decks/${createdDeckIds[0]}`);
  }
  redirect(`/decks`);
}
