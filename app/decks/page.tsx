import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type DeckRow = {
  id: number;
  name: string;
  deckType: "vocab" | "grammar";
  created_at: number;
  total: number;
  due: number;
};

async function listDecks(): Promise<DeckRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const r = await db().execute({
    sql: `SELECT d.id, d.name, d.deck_type, d.created_at,
                 COUNT(c.id) as total,
                 SUM(CASE WHEN c.due_at <= ? THEN 1 ELSE 0 END) as due
          FROM decks d
          LEFT JOIN cards c ON c.deck_id = d.id
          GROUP BY d.id
          ORDER BY d.created_at DESC`,
    args: [now],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    deckType: (String(row.deck_type ?? "vocab") === "grammar"
      ? "grammar"
      : "vocab") as "vocab" | "grammar",
    created_at: Number(row.created_at),
    total: Number(row.total),
    due: Number(row.due ?? 0),
  }));
}

export default async function DecksPage() {
  const decks = await listDecks();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your decks</h1>
        <Link
          href="/import"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700"
        >
          + Import
        </Link>
      </div>

      {decks.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            No decks yet. Paste some content to get started.
          </p>
          <Link
            href="/import"
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Import your first deck →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-5 py-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{d.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.deckType === "grammar"
                          ? "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200"
                          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                      }`}
                    >
                      {d.deckType}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-500">
                    {d.total} cards · {d.due} due
                  </div>
                </div>
                {d.due > 0 && (
                  <span className="ml-3 shrink-0 rounded-full bg-amber-200 px-3 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-500/30 dark:text-amber-100">
                    {d.due} due
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
