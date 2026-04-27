import { type NextRequest, NextResponse } from "next/server";
import { getAppPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Read-only JSON status feed for the OpenClaw / Telegram cron. Returns
// the deck the dispatcher would land on right now plus the headline
// counters, so the cron can compose a rich message like:
//   "📚 Starbucks 星巴克 — 44 to revisit, 8 due"
//
// Auth: requires `?t=<APP_PASSWORD>` (same secret as /study-next). No
// cookie set — this is a server-to-server call.

type Status =
  | {
      ok: true;
      deck: {
        id: number;
        name: string;
        shortName: string;
        path: string;
        url: string;
      };
      counts: {
        total: number;
        needWork: number;
        gotRight: number;
        dueNow: number;
        reviewed: number;
        mastered: number;
      };
      lastStudiedAt: number | null;
    }
  | { ok: false; reason: "empty" };

function shortName(name: string): string {
  // Take the chapter portion of "<source> · Ch N: <chapter>" if present;
  // otherwise trim at the first separator the way /decks does.
  const ch = name.match(/·\s*(Ch\s*\d+.*)$/i);
  if (ch) return ch[1].trim();
  const seps = ["：", "（", "(", " — ", " - "];
  let cut = name.length;
  for (const s of seps) {
    const i = name.indexOf(s);
    if (i > 0 && i < cut) cut = i;
  }
  return name.slice(0, cut).trim();
}

function buildAbs(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return `${base}${path}`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (token !== getAppPassword()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = db();
  const now = Math.floor(Date.now() / 1000);

  // Same priority as /study-next: struggling first, then due, else most-
  // recently-studied, else any deck.
  const struggling = await client.execute({
    sql: `SELECT d.id, d.name, MAX(r.reviewed_at) AS last_reviewed
          FROM decks d
          JOIN cards c ON c.deck_id = d.id
          JOIN reviews r ON r.card_id = c.id
          WHERE c.grammar_point_id IS NULL AND c.box < 5
            AND EXISTS (
              SELECT 1 FROM reviews rr
              WHERE rr.card_id = c.id AND rr.got_it = 0
            )
          GROUP BY d.id
          ORDER BY last_reviewed DESC LIMIT 1`,
  });
  let row: { id: number; name: string } | null = null;
  if (struggling.rows.length > 0) {
    row = {
      id: Number(struggling.rows[0].id),
      name: String(struggling.rows[0].name),
    };
  } else {
    const due = await client.execute({
      sql: `SELECT d.id, d.name FROM decks d
            JOIN cards c ON c.deck_id = d.id
            WHERE c.grammar_point_id IS NULL AND c.due_at <= ?
            GROUP BY d.id
            ORDER BY MAX(c.due_at) DESC LIMIT 1`,
      args: [now],
    });
    if (due.rows.length > 0) {
      row = {
        id: Number(due.rows[0].id),
        name: String(due.rows[0].name),
      };
    }
  }
  if (!row) {
    const body: Status = { ok: false, reason: "empty" };
    return NextResponse.json(body);
  }

  const counters = await client.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM cards WHERE deck_id = ? AND grammar_point_id IS NULL) AS total,
            (SELECT COUNT(*) FROM cards WHERE deck_id = ? AND box >= 5 AND grammar_point_id IS NULL) AS mastered,
            (SELECT COUNT(*) FROM cards WHERE deck_id = ? AND due_at <= ? AND grammar_point_id IS NULL) AS due_now,
            (SELECT COUNT(DISTINCT c.id) FROM cards c
             JOIN reviews r ON r.card_id = c.id
             WHERE c.deck_id = ?) AS reviewed,
            (SELECT COUNT(*) FROM (
              SELECT (
                SELECT got_it FROM reviews r WHERE r.card_id = c.id
                ORDER BY r.reviewed_at DESC LIMIT 1
              ) AS lg FROM cards c WHERE c.deck_id = ? AND c.grammar_point_id IS NULL
            ) WHERE lg = 0) AS need_work,
            (SELECT COUNT(*) FROM (
              SELECT (
                SELECT got_it FROM reviews r WHERE r.card_id = c.id
                ORDER BY r.reviewed_at DESC LIMIT 1
              ) AS lg FROM cards c WHERE c.deck_id = ? AND c.grammar_point_id IS NULL
            ) WHERE lg = 1) AS got_right,
            (SELECT MAX(r.reviewed_at) FROM reviews r
             JOIN cards c ON c.id = r.card_id
             WHERE c.deck_id = ?) AS last_studied`,
    args: [row.id, row.id, row.id, now, row.id, row.id, row.id, row.id],
  });
  const c = counters.rows[0];

  const path = `/decks/${row.id}`;
  const body: Status = {
    ok: true,
    deck: {
      id: row.id,
      name: row.name,
      shortName: shortName(row.name),
      path,
      url: buildAbs(`/study-next?t=${encodeURIComponent(getAppPassword())}`),
    },
    counts: {
      total: Number(c.total),
      needWork: Number(c.need_work ?? 0),
      gotRight: Number(c.got_right ?? 0),
      dueNow: Number(c.due_now),
      reviewed: Number(c.reviewed),
      mastered: Number(c.mastered),
    },
    lastStudiedAt: c.last_studied === null ? null : Number(c.last_studied),
  };
  return NextResponse.json(body);
}
