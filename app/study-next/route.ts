import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  expectedCookieValue,
  getAppPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Smart-redirect entry point for the OpenClaw / Telegram daily reminder.
// Priority:
//   1. Deck with at least one struggling card (missed >=1 time, not yet
//      mastered in box 5), ordered by most-recently-studied — gaps first.
//   2. Else any deck with due cards, most-recently-studied first.
//   3. Else fall through to /decks so the learner can pick.
//
// Auth: pass `?t=<APP_PASSWORD>` to set the auth cookie on the same
// response. Telegram link → first tap signs you in, subsequent taps
// just hit cache (cookie persists 30 days). Without ?t (or with a wrong
// one), the redirect target hits middleware → bounces to /login.
export async function GET(req: NextRequest) {
  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const token = req.nextUrl.searchParams.get("t");

  // 1. Most-recently-studied deck with at least one struggling card.
  const struggling = await client.execute({
    sql: `SELECT d.id AS deck_id, MAX(r.reviewed_at) AS last_reviewed
          FROM decks d
          JOIN cards c ON c.deck_id = d.id
          JOIN reviews r ON r.card_id = c.id
          WHERE c.grammar_point_id IS NULL AND c.box < 5
            AND EXISTS (
              SELECT 1 FROM reviews rr
              WHERE rr.card_id = c.id AND rr.got_it = 0
            )
          GROUP BY d.id
          ORDER BY last_reviewed DESC
          LIMIT 1`,
  });
  let target = "/decks";
  if (struggling.rows.length > 0) {
    target = `/decks/${Number(struggling.rows[0].deck_id)}`;
  } else {
    // 2. Most-recently-studied deck with cards due now.
    const due = await client.execute({
      sql: `SELECT d.id AS deck_id, MAX(r.reviewed_at) AS last_reviewed
            FROM decks d
            JOIN cards c ON c.deck_id = d.id
            LEFT JOIN reviews r ON r.card_id = c.id
            WHERE c.grammar_point_id IS NULL AND c.due_at <= ?
            GROUP BY d.id
            ORDER BY last_reviewed DESC NULLS LAST
            LIMIT 1`,
      args: [now],
    });
    if (due.rows.length > 0) {
      target = `/decks/${Number(due.rows[0].deck_id)}`;
    }
  }

  const res = NextResponse.redirect(buildAbs(target));
  if (token && token === getAppPassword()) {
    res.cookies.set(COOKIE_NAME, await expectedCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return res;
}

// Build an absolute URL using either VERCEL_URL (prod) or a local host
// fallback. Telegram / link previews need an absolute target.
function buildAbs(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return `${base}${path}`;
}
