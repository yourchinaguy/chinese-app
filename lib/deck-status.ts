import type { Client } from "@libsql/client";

export type DeckStatus = "waiting" | "studying" | "done";

export const STATUS_LABEL: Record<DeckStatus, string> = {
  waiting: "waiting",
  studying: "studying",
  done: "done",
};

// done = at least one passing test recorded
// studying = no pass yet, but at least one card has been reviewed
// waiting = no reviews and no tests
export async function getDeckStatuses(
  client: Client,
  deckIds: number[],
): Promise<Map<number, DeckStatus>> {
  const out = new Map<number, DeckStatus>();
  if (deckIds.length === 0) return out;
  for (const id of deckIds) out.set(id, "waiting");

  const placeholders = deckIds.map(() => "?").join(",");

  const passed = await client.execute({
    sql: `SELECT DISTINCT deck_id FROM tests
          WHERE passed = 1 AND deck_id IN (${placeholders})`,
    args: deckIds,
  });
  const passedSet = new Set(passed.rows.map((r) => Number(r.deck_id)));

  const reviewed = await client.execute({
    sql: `SELECT DISTINCT c.deck_id AS deck_id
          FROM reviews r
          JOIN cards c ON c.id = r.card_id
          WHERE c.deck_id IN (${placeholders})`,
    args: deckIds,
  });
  const reviewedSet = new Set(reviewed.rows.map((r) => Number(r.deck_id)));

  for (const id of deckIds) {
    if (passedSet.has(id)) out.set(id, "done");
    else if (reviewedSet.has(id)) out.set(id, "studying");
  }
  return out;
}

export async function getDeckStatus(
  client: Client,
  deckId: number,
): Promise<DeckStatus> {
  const m = await getDeckStatuses(client, [deckId]);
  return m.get(deckId) ?? "waiting";
}

export type DeckProgress = {
  total: number;
  reviewedCount: number;
  mastered: number;
  struggling: number;
  dueNow: number;
  nextDueAt: number | null; // unix seconds; earliest non-mastered due_at
  lastReviewedAt: number | null;
  latestTest: {
    passed: boolean;
    missedCount: number;
    totalCards: number;
    completedAt: number;
  } | null;
};

// Pull a single deck's progress counters in one round-trip per metric.
// Used by the deck detail page and the homepage "in progress" list.
export async function getDeckProgress(
  client: Client,
  deckId: number,
): Promise<DeckProgress> {
  const now = Math.floor(Date.now() / 1000);

  const totalRes = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM cards
          WHERE deck_id = ? AND grammar_point_id IS NULL`,
    args: [deckId],
  });
  const total = Number(totalRes.rows[0].c);

  const reviewedRes = await client.execute({
    sql: `SELECT COUNT(DISTINCT c.id) AS c FROM cards c
          JOIN reviews r ON r.card_id = c.id
          WHERE c.deck_id = ?`,
    args: [deckId],
  });
  const reviewedCount = Number(reviewedRes.rows[0].c);

  // Mastered = box 5; struggling = card has been missed at least once and
  // hasn't graduated yet. Due = due_at <= now.
  const masteredRes = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM cards
          WHERE deck_id = ? AND box >= 5 AND grammar_point_id IS NULL`,
    args: [deckId],
  });
  const mastered = Number(masteredRes.rows[0].c);

  const strugglingRes = await client.execute({
    sql: `SELECT COUNT(DISTINCT c.id) AS c FROM cards c
          JOIN reviews r ON r.card_id = c.id
          WHERE c.deck_id = ? AND r.got_it = 0 AND c.box < 5`,
    args: [deckId],
  });
  const struggling = Number(strugglingRes.rows[0].c);

  const dueRes = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM cards
          WHERE deck_id = ? AND due_at <= ? AND grammar_point_id IS NULL`,
    args: [deckId, now],
  });
  const dueNow = Number(dueRes.rows[0].c);

  const nextRes = await client.execute({
    sql: `SELECT MIN(due_at) AS m FROM cards
          WHERE deck_id = ? AND box < 5 AND grammar_point_id IS NULL`,
    args: [deckId],
  });
  const nextDueAt =
    nextRes.rows[0].m === null ? null : Number(nextRes.rows[0].m);

  const lastRes = await client.execute({
    sql: `SELECT MAX(r.reviewed_at) AS m FROM reviews r
          JOIN cards c ON c.id = r.card_id
          WHERE c.deck_id = ?`,
    args: [deckId],
  });
  const lastReviewedAt =
    lastRes.rows[0].m === null ? null : Number(lastRes.rows[0].m);

  const testRes = await client.execute({
    sql: `SELECT passed, total_cards, missed_count, completed_at
          FROM tests WHERE deck_id = ?
          ORDER BY completed_at DESC LIMIT 1`,
    args: [deckId],
  });
  const latestTest =
    testRes.rows.length === 0
      ? null
      : {
          passed: Number(testRes.rows[0].passed) === 1,
          totalCards: Number(testRes.rows[0].total_cards),
          missedCount: Number(testRes.rows[0].missed_count),
          completedAt: Number(testRes.rows[0].completed_at),
        };

  return {
    total,
    reviewedCount,
    mastered,
    struggling,
    dueNow,
    nextDueAt,
    lastReviewedAt,
    latestTest,
  };
}

export type StudyingDeckSummary = {
  deckId: number;
  name: string;
  total: number;
  dueNow: number;
  reviewedCount: number;
  mastered: number;
  lastReviewedAt: number | null;
};

// Decks the user has touched but hasn't passed a test on yet, sorted by
// most recently studied. Surfaced on the homepage so resumption is one click.
export async function listStudyingDecks(
  client: Client,
  limit: number = 5,
): Promise<StudyingDeckSummary[]> {
  const r = await client.execute({
    sql: `SELECT d.id AS deck_id, d.name,
                 (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.grammar_point_id IS NULL) AS total,
                 (SELECT COUNT(*) FROM cards c
                  WHERE c.deck_id = d.id AND c.due_at <= ? AND c.grammar_point_id IS NULL) AS due_now,
                 (SELECT COUNT(DISTINCT c.id) FROM cards c
                  JOIN reviews r ON r.card_id = c.id WHERE c.deck_id = d.id) AS reviewed,
                 (SELECT COUNT(*) FROM cards c
                  WHERE c.deck_id = d.id AND c.box >= 5 AND c.grammar_point_id IS NULL) AS mastered,
                 (SELECT MAX(r.reviewed_at) FROM reviews r
                  JOIN cards c ON c.id = r.card_id WHERE c.deck_id = d.id) AS last_reviewed
          FROM decks d
          WHERE EXISTS (SELECT 1 FROM cards c
                        JOIN reviews r ON r.card_id = c.id WHERE c.deck_id = d.id)
            AND NOT EXISTS (SELECT 1 FROM tests t WHERE t.deck_id = d.id AND t.passed = 1)
          ORDER BY last_reviewed DESC
          LIMIT ?`,
    args: [Math.floor(Date.now() / 1000), limit],
  });
  return r.rows.map((row) => ({
    deckId: Number(row.deck_id),
    name: String(row.name),
    total: Number(row.total),
    dueNow: Number(row.due_now),
    reviewedCount: Number(row.reviewed),
    mastered: Number(row.mastered),
    lastReviewedAt:
      row.last_reviewed === null ? null : Number(row.last_reviewed),
  }));
}
