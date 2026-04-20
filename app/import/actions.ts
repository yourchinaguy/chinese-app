"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gradeText, type GradeResult } from "@/lib/grade";
import { detectGrammarPoints, type GrammarMatch } from "@/lib/grammar";
import type { HskLevel } from "@/lib/hsk";
import { importTextAsDecks } from "@/lib/import-core";

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
  // If the user arrived from /starter/[slug] via the simplify loop, we keep
  // the original (harder) version attached to the source so the deck detail
  // page can offer 'Ready for the original?' once the learner has studied.
  fromStarterSlug?: string | null;
};

export async function createDeck(input: CreateDeckInput): Promise<void> {
  const knownSet = await loadKnownSet();
  const result = await importTextAsDecks(db(), input, knownSet);
  if (result.decks.length === 1) {
    redirect(`/decks/${result.decks[0].id}`);
  }
  redirect(`/decks`);
}
