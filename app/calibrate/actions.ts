"use server";

import { db } from "@/lib/db";

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
