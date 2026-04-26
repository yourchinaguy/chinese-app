"use server";

import { redirect } from "next/navigation";
import { getVocabPack } from "@/data/vocab-packs";
import { db } from "@/lib/db";
import { getHskLevel } from "@/lib/hsk";
import { toToneMarks } from "@/lib/pinyin";
import { initialState } from "@/lib/srs";

// Import a vocab pack as a single vocab deck. Bypasses the analyze pipeline
// (no segmentation, grading, or grammar detection — the pack is already
// curated). One card per word.
export async function importVocabPack(slug: string): Promise<void> {
  const pack = getVocabPack(slug);
  if (!pack) throw new Error(`unknown pack: ${slug}`);
  if (pack.words.length === 0) throw new Error("pack has no words");

  // Dedupe by hanzi — if a pack has the same word listed twice (different
  // glosses, different chapters), merge with " / " between glosses so we
  // don't create two cards for the same word.
  const merged = new Map<string, { pinyin: string; gloss: string }>();
  for (const w of pack.words) {
    const existing = merged.get(w.hanzi);
    if (existing) {
      if (!existing.gloss.includes(w.gloss)) {
        existing.gloss = `${existing.gloss} / ${w.gloss}`;
      }
    } else {
      merged.set(w.hanzi, {
        pinyin: toToneMarks(w.pinyin) ?? w.pinyin,
        gloss: w.gloss,
      });
    }
  }

  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const title = pack.title;

  // Synthesize a 'source' row so the deck has somewhere to point. The text
  // is the joined hanzi of every word — not really a readable article, but
  // gives us something to store.
  const sourceText = Array.from(merged.keys()).join("、");
  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
    args: [title, sourceText, now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  const deckResult = await client.execute({
    sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'vocab', ?) RETURNING id",
    args: [title, sourceId, now],
  });
  const deckId = Number(deckResult.rows[0].id);

  const srs = initialState();
  for (const [hanzi, { pinyin, gloss }] of merged) {
    const hskLevel = getHskLevel(hanzi);
    await client.execute({
      sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                box, due_at, last_reviewed_at, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      args: [
        deckId,
        hanzi,
        pinyin,
        gloss,
        hskLevel,
        srs.box,
        srs.due_at,
        srs.last_reviewed_at,
        now,
      ],
    });
  }

  redirect(`/decks/${deckId}`);
}
