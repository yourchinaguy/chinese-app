"use server";

import { redirect } from "next/navigation";
import { getStarterBundle, getBundleArticles } from "@/data/starter";
import { db } from "@/lib/db";
import { autoSelectFromText, importTextAsDecks } from "@/lib/import-core";

async function loadKnownSet(): Promise<Set<string>> {
  const r = await db().execute("SELECT hanzi FROM known_words");
  return new Set(r.rows.map((row) => String(row.hanzi)));
}

// Imports every article in a bundle as its own pair of (vocab + grammar) decks.
// Uses the same auto-selection as `npm run import-text` — TARGET + PROPER_NOUN
// words plus all detected grammar points.
export async function importBundle(slug: string): Promise<void> {
  const bundle = getStarterBundle(slug);
  if (!bundle) throw new Error(`unknown bundle: ${slug}`);
  const articles = getBundleArticles(bundle);
  if (articles.length === 0) throw new Error("bundle has no articles");

  const knownSet = await loadKnownSet();
  const client = db();

  for (const article of articles) {
    const { selectedHanzi, selectedGrammarPointIds } = autoSelectFromText(
      article.text,
      knownSet,
    );
    if (selectedHanzi.length === 0 && selectedGrammarPointIds.length === 0) {
      continue; // nothing to learn from this one
    }
    await importTextAsDecks(
      client,
      {
        title: article.title,
        kind: "article",
        text: article.text,
        selectedHanzi,
        selectedGrammarPointIds,
        fromStarterSlug: article.slug,
      },
      knownSet,
    );
  }

  redirect("/decks");
}
