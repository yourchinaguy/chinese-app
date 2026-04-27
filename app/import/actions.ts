"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lookupForCard } from "@/lib/dictionary";
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

  // Enrich BEYOND_HSK / TOO_HARD words with CC-CEDICT pinyin + gloss so the
  // import preview shows meaning for advanced vocabulary. Cache by hanzi to
  // skip duplicate lookups across repeated tokens.
  const cache = new Map<string, { pinyin: string | null; gloss: string | null }>();
  const enriched = grade.graded.map((g) => {
    if (g.pinyin && g.gloss) return g;
    let fb = cache.get(g.hanzi);
    if (!fb) {
      const r = lookupForCard(g.hanzi);
      fb = { pinyin: r.pinyin, gloss: r.gloss };
      cache.set(g.hanzi, fb);
    }
    return {
      ...g,
      pinyin: g.pinyin ?? fb.pinyin,
      gloss: g.gloss ?? fb.gloss,
    };
  });

  return { ...grade, graded: enriched, grammar };
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
