import { Import } from "./Import";
import { db } from "@/lib/db";
import { getEntriesByLevel, type HskLevel } from "@/lib/hsk";

export const dynamic = "force-dynamic";

// Fallback: Jan's self-reported level. The slider lets him override anyway.
const FALLBACK_LEVEL: HskLevel = 4;

async function inferDefaultLevel(): Promise<HskLevel> {
  const r = await db().execute("SELECT hanzi FROM known_words");
  const known = new Set(r.rows.map((row) => String(row.hanzi)));
  if (known.size === 0) return FALLBACK_LEVEL;

  // For each HSK level, compute the fraction of level-N words the user knows.
  // The highest level with ≥50% coverage is the inferred level. Calibration
  // alone won't hit 50% (it samples only 8 words/level), so this is mostly
  // meaningful once reviews have confirmed-known a bunch. Otherwise fall back.
  let inferred: HskLevel | null = null;
  for (const lvl of [1, 2, 3, 4, 5, 6] as HskLevel[]) {
    const entries = getEntriesByLevel(lvl);
    if (entries.length === 0) continue;
    const knownAtLevel = entries.filter((e) => known.has(e.hanzi)).length;
    if (knownAtLevel / entries.length >= 0.5) inferred = lvl;
  }
  return inferred ?? FALLBACK_LEVEL;
}

type Kind = "article" | "podcast" | "other";

function isKind(x: unknown): x is Kind {
  return x === "article" || x === "podcast" || x === "other";
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const defaultLevel = await inferDefaultLevel();
  const sp = await searchParams;
  const kindParam = firstParam(sp.kind);
  const prefill = {
    text: firstParam(sp.text) ?? "",
    title: firstParam(sp.title) ?? "",
    kind: isKind(kindParam) ? kindParam : "article",
  };
  return <Import defaultLevel={defaultLevel} prefill={prefill} />;
}
