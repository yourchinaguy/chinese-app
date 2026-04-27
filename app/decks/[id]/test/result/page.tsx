import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TestResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pass?: string; missed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const passed = sp.pass === "1";
  const missed = Number(sp.missed ?? 0);

  const deckId = Number(id);
  const deckRes = await db().execute({
    sql: "SELECT name FROM decks WHERE id = ?",
    args: [deckId],
  });
  if (deckRes.rows.length === 0) notFound();
  const deckName = String(deckRes.rows[0].name);

  // Try to find the misses deck spawned from this test run.
  let missesDeckId: number | null = null;
  if (!passed) {
    const r = await db().execute({
      sql: `SELECT id FROM decks
            WHERE name = ?
            ORDER BY created_at DESC LIMIT 1`,
      args: [`Misses from ${deckName}`],
    });
    if (r.rows.length > 0) missesDeckId = Number(r.rows[0].id);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/decks/${deckId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← {deckName}
        </Link>
      </div>

      {passed ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-900/20">
          <div className="text-3xl">🟢</div>
          <h1 className="mt-3 text-2xl font-semibold">Done — 100% pass</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            This deck is now marked done.
          </p>
          <Link
            href="/decks"
            className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Back to decks
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-900/20">
          <div className="text-3xl">📚</div>
          <h1 className="mt-3 text-2xl font-semibold">Not done yet</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Missed {missed} card{missed === 1 ? "" : "s"}. They&rsquo;ve been
            collected into a study deck so you can grind them before re-testing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {missesDeckId && (
              <Link
                href={`/decks/${missesDeckId}`}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white"
              >
                Study the misses →
              </Link>
            )}
            <Link
              href={`/decks/${deckId}/test`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Re-test
            </Link>
            <Link
              href={`/decks/${deckId}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Back to deck
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
