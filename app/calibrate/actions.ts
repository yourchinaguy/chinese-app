"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cleanTranslations, getHskEntry } from "@/lib/hsk";
import { initialState } from "@/lib/srs";

export async function saveCalibration(
  knownHanzi: string[],
): Promise<{ saved: number }> {
  const now = Math.floor(Date.now() / 1000);
  for (const hanzi of knownHanzi) {
    await db().execute({
      sql: `INSERT INTO known_words (hanzi, source, confidence, updated_at)
            VALUES (?, 'calibration', 2, ?)
            ON CONFLICT(hanzi) DO UPDATE SET
              confidence = MAX(confidence, excluded.confidence),
              source = excluded.source,
              updated_at = excluded.updated_at`,
      args: [hanzi, now],
    });
  }
  return { saved: knownHanzi.length };
}

export async function getKnownCount(): Promise<number> {
  const r = await db().execute("SELECT COUNT(*) as c FROM known_words");
  return Number(r.rows[0].c);
}

export async function createBaselineDeck(missedHanzi: string[]): Promise<void> {
  if (missedHanzi.length === 0) throw new Error("no words to add");
  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const dateLabel = new Date().toISOString().slice(0, 10);
  const title = `Baseline — calibration ${dateLabel}`;

  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
    args: [title, missedHanzi.join(" · "), now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  const deckResult = await client.execute({
    sql: "INSERT INTO decks (name, source_id, created_at) VALUES (?, ?, ?) RETURNING id",
    args: [title, sourceId, now],
  });
  const deckId = Number(deckResult.rows[0].id);

  const srs = initialState();
  for (const hanzi of missedHanzi) {
    const entry = getHskEntry(hanzi);
    const glosses = cleanTranslations(entry);
    await client.execute({
      sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                box, due_at, last_reviewed_at, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      args: [
        deckId,
        hanzi,
        entry?.pinyin ?? null,
        glosses[0] ?? null,
        entry?.level ?? null,
        srs.box,
        srs.due_at,
        srs.last_reviewed_at,
        now,
      ],
    });
  }

  redirect(`/decks/${deckId}`);
}
