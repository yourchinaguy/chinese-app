// One-shot migration: rewrite cards.pinyin in Turso so any tone-numbered
// entries become tone-marked. Idempotent — already-marked rows pass through
// unchanged.
//
// Run:  npm run normalize-pinyin

import { createClient } from "@libsql/client";
import { toToneMarks } from "../lib/pinyin";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set");
    process.exit(1);
  }
  const client = createClient({ url, authToken });

  const r = await client.execute(
    "SELECT id, hanzi, pinyin FROM cards WHERE pinyin IS NOT NULL AND pinyin GLOB '*[0-9]*'",
  );
  console.log(`scanning ${r.rows.length} cards with numeric pinyin`);

  let updated = 0;
  for (const row of r.rows) {
    const id = Number(row.id);
    const before = String(row.pinyin);
    const after = toToneMarks(before) ?? before;
    if (after === before) continue;
    await client.execute({
      sql: "UPDATE cards SET pinyin = ? WHERE id = ?",
      args: [after, id],
    });
    updated++;
    if (updated <= 5) console.log(`  ${row.hanzi}: "${before}" → "${after}"`);
  }
  console.log(`updated ${updated} cards`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
