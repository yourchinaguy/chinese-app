"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Hard-delete a deck and everything that lives under it: review history,
// then cards, then the deck row itself. Sources are left alone — a single
// source row often points to multiple decks (vocab + grammar pair, original
// + simplified version), and orphaned sources cost almost nothing.
// known_words entries promoted via Leitner box 5 also stay; the user
// genuinely learned those.
export async function renameDeck(id: number, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("name is required");
  if (trimmed.length > 200) throw new Error("name too long (max 200 chars)");
  await db().execute({
    sql: "UPDATE decks SET name = ? WHERE id = ?",
    args: [trimmed, id],
  });
  revalidatePath("/decks");
  revalidatePath(`/decks/${id}`);
}

export async function deleteDeck(id: number, redirectTo?: string): Promise<void> {
  const client = db();
  await client.execute({
    sql: "DELETE FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?)",
    args: [id],
  });
  await client.execute({
    sql: "DELETE FROM cards WHERE deck_id = ?",
    args: [id],
  });
  await client.execute({
    sql: "DELETE FROM decks WHERE id = ?",
    args: [id],
  });
  revalidatePath("/decks");
  if (redirectTo) redirect(redirectTo);
}
