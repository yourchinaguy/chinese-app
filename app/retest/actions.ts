"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getHskEntry } from "@/lib/hsk";
import { toToneMarks } from "@/lib/pinyin";
import {
  poolSize,
  samplePool,
  RETEST_POOLS,
  type RetestPoolId,
  type RetestWord,
} from "@/lib/retest";
import { initialState } from "@/lib/srs";

const RETEST_DECK_NAME = "Retest misses";

export async function poolSnapshot(
  pool: RetestPoolId,
): Promise<{ size: number; words: RetestWord[] }> {
  const client = db();
  const [size, words] = await Promise.all([
    poolSize(client, pool),
    samplePool(client, pool),
  ]);
  return { size, words };
}

export async function poolSizes(): Promise<Record<RetestPoolId, number>> {
  const client = db();
  const out = {} as Record<RetestPoolId, number>;
  for (const p of RETEST_POOLS) {
    out[p.id] = await poolSize(client, p.id);
  }
  return out;
}

export type RetestResult = {
  hanzi: string;
  known: boolean;
};

export type SubmitRetestSummary = {
  total: number;
  knownCount: number;
  missedCount: number;
  retestDeckId: number | null;
};

// Process a finished retest:
// - Bump known_words.confidence (capped at 5) for each hit; refresh updated_at.
// - Misses: append/upsert into a single persistent 'Retest misses' vocab deck.
//   If the word's already there, reset its SRS to box 1, due now, so it
//   pops back into rotation without creating a duplicate.
// - Always: insert a row into `retests` for history.
export async function submitRetest(
  pool: RetestPoolId,
  results: RetestResult[],
): Promise<SubmitRetestSummary> {
  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const known = results.filter((r) => r.known);
  const missed = results.filter((r) => !r.known);

  // 1. Hits: bump confidence in known_words.
  for (const r of known) {
    await client.execute({
      sql: `INSERT INTO known_words (hanzi, source, confidence, updated_at)
            VALUES (?, 'retest', 3, ?)
            ON CONFLICT(hanzi) DO UPDATE SET
              confidence = MIN(confidence + 1, 5),
              updated_at = excluded.updated_at`,
      args: [r.hanzi, now],
    });
  }

  // 2. Misses: ensure the Retest-misses deck exists, then upsert each card.
  let retestDeckId: number | null = null;
  if (missed.length > 0) {
    const existing = await client.execute({
      sql: "SELECT id FROM decks WHERE name = ? AND deck_type = 'vocab' LIMIT 1",
      args: [RETEST_DECK_NAME],
    });
    if (existing.rows.length > 0) {
      retestDeckId = Number(existing.rows[0].id);
    } else {
      // Synthesize a source row so the deck has somewhere to point.
      const sourceRes = await client.execute({
        sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
        args: [RETEST_DECK_NAME, "(grows from retest misses)", now],
      });
      const sourceId = Number(sourceRes.rows[0].id);
      const deckRes = await client.execute({
        sql: "INSERT INTO decks (name, source_id, deck_type, created_at) VALUES (?, ?, 'vocab', ?) RETURNING id",
        args: [RETEST_DECK_NAME, sourceId, now],
      });
      retestDeckId = Number(deckRes.rows[0].id);
    }

    const srs = initialState();
    for (const r of missed) {
      // Look up enriched data so cards have pinyin + gloss + hsk level.
      const e = getHskEntry(r.hanzi);
      const pinyin = toToneMarks(e?.pinyin ?? null);
      const gloss = e?.translations?.[0] ?? null;
      const hskLevel = e?.level ?? null;

      const existingCard = await client.execute({
        sql: "SELECT id FROM cards WHERE deck_id = ? AND hanzi = ? LIMIT 1",
        args: [retestDeckId, r.hanzi],
      });
      if (existingCard.rows.length > 0) {
        // Reset SRS so it pops back into rotation.
        await client.execute({
          sql: `UPDATE cards SET box = ?, due_at = ?, last_reviewed_at = NULL WHERE id = ?`,
          args: [srs.box, srs.due_at, Number(existingCard.rows[0].id)],
        });
      } else {
        await client.execute({
          sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                    box, due_at, last_reviewed_at, created_at)
                VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)`,
          args: [
            retestDeckId,
            r.hanzi,
            pinyin,
            gloss,
            hskLevel,
            srs.box,
            srs.due_at,
            now,
          ],
        });
      }
    }
  }

  // 3. Log the retest.
  await client.execute({
    sql: "INSERT INTO retests (pool, completed_at, sampled_count, known_count) VALUES (?, ?, ?, ?)",
    args: [pool, now, results.length, known.length],
  });

  revalidatePath("/decks");

  return {
    total: results.length,
    knownCount: known.length,
    missedCount: missed.length,
    retestDeckId,
  };
}
