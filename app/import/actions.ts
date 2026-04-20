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
  // Detect grammar first so we know which tokens are just connectives of a
  // surfaced structure and shouldn't double-appear as vocabulary.
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
};

export async function createDeck(input: CreateDeckInput): Promise<void> {
  const { title, kind, text, selectedHanzi } = input;
  if (!title.trim() || !text.trim() || selectedHanzi.length === 0) {
    throw new Error("title, text, and at least one word are required");
  }

  const client = db();
  const now = Math.floor(Date.now() / 1000);

  const knownSet = await loadKnownSet();
  const grade = gradeText(text, { knownSet, targetLevel: 4 });
  const byHanzi = new Map<string, (typeof grade.graded)[number]>();
  for (const g of grade.graded) {
    if (!byHanzi.has(g.hanzi)) byHanzi.set(g.hanzi, g);
  }

  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, ?, ?, ?) RETURNING id",
    args: [title.trim(), kind, text, now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  const deckResult = await client.execute({
    sql: "INSERT INTO decks (name, source_id, created_at) VALUES (?, ?, ?) RETURNING id",
    args: [title.trim(), sourceId, now],
  });
  const deckId = Number(deckResult.rows[0].id);

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

  redirect(`/decks/${deckId}`);
}
