import { Import } from "./Import";
import { db } from "@/lib/db";
import type { HskLevel } from "@/lib/hsk";

export const dynamic = "force-dynamic";

async function inferDefaultLevel(): Promise<HskLevel> {
  const r = await db().execute("SELECT COUNT(*) as c FROM known_words");
  const count = Number(r.rows[0].c);
  // If not calibrated, default to HSK 4 (Jan's self-reported level)
  // Otherwise a rough proxy: known count / 500 = level
  if (count < 20) return 4;
  const approx = Math.min(6, Math.max(1, Math.ceil(count / 500)));
  return approx as HskLevel;
}

export default async function ImportPage() {
  const defaultLevel = await inferDefaultLevel();
  return <Import defaultLevel={defaultLevel} />;
}
