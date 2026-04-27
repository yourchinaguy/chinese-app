"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { initialState } from "@/lib/srs";

// Record a completed test pass. If passed (zero misses), the deck flips to
// "done". If failed, the missed cards spawn a new study deck so the user can
// grind those before re-testing the parent.
export async function submitTest(
  deckId: number,
  missedCardIds: number[],
  totalCards: number,
): Promise<void> {
  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const passed = missedCardIds.length === 0;

  await client.execute({
    sql: `INSERT INTO tests (deck_id, passed, total_cards, missed_count, completed_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [deckId, passed ? 1 : 0, totalCards, missedCardIds.length, now],
  });

  if (!passed && missedCardIds.length > 0) {
    const parentRes = await client.execute({
      sql: "SELECT name, source_id, deck_type FROM decks WHERE id = ?",
      args: [deckId],
    });
    if (parentRes.rows.length > 0) {
      const parent = parentRes.rows[0];
      const missesName = `Misses from ${String(parent.name)}`;
      const deckType = String(parent.deck_type ?? "vocab");
      const sourceId =
        parent.source_id === null ? null : Number(parent.source_id);

      const newDeck = await client.execute({
        sql: `INSERT INTO decks (name, source_id, deck_type, created_at)
              VALUES (?, ?, ?, ?) RETURNING id`,
        args: [missesName, sourceId, deckType, now],
      });
      const newDeckId = Number(newDeck.rows[0].id);

      const placeholders = missedCardIds.map(() => "?").join(",");
      const cardsRes = await client.execute({
        sql: `SELECT hanzi, pinyin, gloss, hsk_level, example_sentence,
                     grammar_point_id, matched_text
              FROM cards WHERE id IN (${placeholders})`,
        args: missedCardIds,
      });
      const srs = initialState();
      for (const c of cardsRes.rows) {
        await client.execute({
          sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level,
                                    example_sentence, grammar_point_id, matched_text,
                                    box, due_at, last_reviewed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            newDeckId,
            String(c.hanzi),
            c.pinyin === null ? null : String(c.pinyin),
            c.gloss === null ? null : String(c.gloss),
            c.hsk_level === null ? null : Number(c.hsk_level),
            c.example_sentence === null ? null : String(c.example_sentence),
            c.grammar_point_id === null ? null : String(c.grammar_point_id),
            c.matched_text === null ? null : String(c.matched_text),
            srs.box,
            srs.due_at,
            srs.last_reviewed_at,
            now,
          ],
        });
      }
    }
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  if (passed) {
    redirect(`/decks/${deckId}/test/result?pass=1`);
  } else {
    redirect(`/decks/${deckId}/test/result?pass=0&missed=${missedCardIds.length}`);
  }
}
