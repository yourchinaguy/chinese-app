"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { advance } from "@/lib/srs";

export async function submitReview(
  cardId: number,
  gotIt: boolean,
): Promise<void> {
  const client = db();

  const cardRes = await client.execute({
    sql: "SELECT box, hanzi FROM cards WHERE id = ?",
    args: [cardId],
  });
  if (cardRes.rows.length === 0) throw new Error("card not found");
  const currentBox = Number(cardRes.rows[0].box);
  const hanzi = String(cardRes.rows[0].hanzi);

  const next = advance(currentBox, gotIt);
  const now = Math.floor(Date.now() / 1000);

  await client.execute({
    sql: `UPDATE cards SET box = ?, due_at = ?, last_reviewed_at = ? WHERE id = ?`,
    args: [next.box, next.due_at, next.last_reviewed_at, cardId],
  });

  await client.execute({
    sql: `INSERT INTO reviews (card_id, got_it, reviewed_at) VALUES (?, ?, ?)`,
    args: [cardId, gotIt ? 1 : 0, now],
  });

  // If the card graduated to box 5, treat as "known" — the user nailed it five
  // reviews in a row, so it belongs in their known-word model.
  if (next.box === 5) {
    await client.execute({
      sql: `INSERT INTO known_words (hanzi, source, confidence, updated_at)
            VALUES (?, 'review', 3, ?)
            ON CONFLICT(hanzi) DO UPDATE SET
              confidence = MAX(confidence, excluded.confidence),
              updated_at = excluded.updated_at`,
      args: [hanzi, now],
    });
  }

  revalidatePath("/decks");
}
