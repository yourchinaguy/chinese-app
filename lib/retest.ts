import type { Client } from "@libsql/client";
import { vocabPacks } from "@/data/vocab-packs";
import { getEntriesByLevel, getHskEntry, type HskLevel } from "./hsk";

export type RetestPoolId =
  | "hsk-1"
  | "hsk-2"
  | "hsk-3"
  | "hsk-4"
  | "hsk-5"
  | "hsk-6"
  | "business-chinese"
  | "newly-studied"
  | "all-known";

export type RetestPool = {
  id: RetestPoolId;
  label: string;
  description: string;
};

export const RETEST_POOLS: RetestPool[] = [
  { id: "hsk-4", label: "HSK 4", description: "Random sample from the HSK 4 list." },
  { id: "hsk-5", label: "HSK 5", description: "Random sample from the HSK 5 list." },
  { id: "hsk-6", label: "HSK 6", description: "Random sample from the HSK 6 list." },
  {
    id: "business-chinese",
    label: "Business Chinese",
    description: "Random sample from the merged 成功之道 textbook pack (949 words).",
  },
  {
    id: "newly-studied",
    label: "Newly studied",
    description: "Words you imported in the last 30 days that you actually reviewed at least once.",
  },
  {
    id: "all-known",
    label: "All my known words",
    description: "Random sample from your full known-word set — see what's drifted.",
  },
];

export const RETEST_SAMPLE_SIZE = 20;

export type RetestWord = {
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  hskLevel: number | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function enrich(hanzi: string): RetestWord {
  const e = getHskEntry(hanzi);
  return {
    hanzi,
    pinyin: e?.pinyin ?? null,
    gloss: e?.translations?.[0] ?? null,
    hskLevel: e?.level ?? null,
  };
}

export async function samplePool(
  client: Client,
  pool: RetestPoolId,
): Promise<RetestWord[]> {
  if (pool.startsWith("hsk-")) {
    const lvl = Number(pool.split("-")[1]) as HskLevel;
    const entries = getEntriesByLevel(lvl);
    return shuffle(entries)
      .slice(0, RETEST_SAMPLE_SIZE)
      .map((e) => ({
        hanzi: e.hanzi,
        pinyin: e.pinyin,
        gloss: e.translations?.[0] ?? null,
        hskLevel: e.level,
      }));
  }

  if (pool === "business-chinese") {
    const pack = vocabPacks[0];
    if (!pack) return [];
    return shuffle(pack.words)
      .slice(0, RETEST_SAMPLE_SIZE)
      .map((w) => {
        const hsk = getHskEntry(w.hanzi);
        return {
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          gloss: w.gloss,
          hskLevel: hsk?.level ?? null,
        };
      });
  }

  if (pool === "newly-studied") {
    const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
    const r = await client.execute({
      sql: `SELECT DISTINCT hanzi FROM cards
            WHERE created_at >= ? AND last_reviewed_at IS NOT NULL
              AND grammar_point_id IS NULL`,
      args: [cutoff],
    });
    const hanzi = r.rows.map((row) => String(row.hanzi));
    return shuffle(hanzi).slice(0, RETEST_SAMPLE_SIZE).map(enrich);
  }

  if (pool === "all-known") {
    const r = await client.execute(
      "SELECT hanzi FROM known_words",
    );
    const hanzi = r.rows.map((row) => String(row.hanzi));
    return shuffle(hanzi).slice(0, RETEST_SAMPLE_SIZE).map(enrich);
  }

  return [];
}

export async function poolSize(
  client: Client,
  pool: RetestPoolId,
): Promise<number> {
  if (pool.startsWith("hsk-")) {
    const lvl = Number(pool.split("-")[1]) as HskLevel;
    return getEntriesByLevel(lvl).length;
  }
  if (pool === "business-chinese") {
    return vocabPacks[0]?.words.length ?? 0;
  }
  if (pool === "newly-studied") {
    const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
    const r = await client.execute({
      sql: `SELECT COUNT(DISTINCT hanzi) AS c FROM cards
            WHERE created_at >= ? AND last_reviewed_at IS NOT NULL
              AND grammar_point_id IS NULL`,
      args: [cutoff],
    });
    return Number(r.rows[0].c);
  }
  if (pool === "all-known") {
    const r = await client.execute(
      "SELECT COUNT(*) AS c FROM known_words",
    );
    return Number(r.rows[0].c);
  }
  return 0;
}
