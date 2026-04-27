import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type TestRow = {
  id: number;
  passed: boolean;
  total_cards: number;
  missed_count: number;
  completed_at: number;
};

type CardStat = {
  id: number;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  reviews: number;
  misses: number;
  lastResult: boolean | null;
  lastReviewedAt: number | null;
  box: number;
};

// Mirror DeckTitle's splitter so the history header doesn't show the long
// "<source> · Ch N: <chapter>" form on a narrow screen.
function splitDeckName(name: string): { main: string; sub: string | null } {
  const m = name.match(/^(.+?)\s*·\s*(Ch\s*\d+.*)$/i);
  if (m) return { main: m[2].trim(), sub: m[1].trim() };
  return { main: name, sub: null };
}

function formatDate(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadHistory(deckId: number) {
  const client = db();
  const deckRes = await client.execute({
    sql: "SELECT id, name FROM decks WHERE id = ?",
    args: [deckId],
  });
  if (deckRes.rows.length === 0) return null;
  const deck = {
    id: Number(deckRes.rows[0].id),
    name: String(deckRes.rows[0].name),
  };

  const testsRes = await client.execute({
    sql: `SELECT id, passed, total_cards, missed_count, completed_at
          FROM tests WHERE deck_id = ?
          ORDER BY completed_at DESC`,
    args: [deckId],
  });
  const tests: TestRow[] = testsRes.rows.map((r) => ({
    id: Number(r.id),
    passed: Number(r.passed) === 1,
    total_cards: Number(r.total_cards),
    missed_count: Number(r.missed_count),
    completed_at: Number(r.completed_at),
  }));

  const cardsRes = await client.execute({
    sql: `SELECT c.id, c.hanzi, c.pinyin, c.gloss, c.box, c.last_reviewed_at,
                 (SELECT COUNT(*) FROM reviews r WHERE r.card_id = c.id) as reviews,
                 (SELECT COUNT(*) FROM reviews r WHERE r.card_id = c.id AND r.got_it = 0) as misses,
                 (SELECT got_it FROM reviews r WHERE r.card_id = c.id
                   ORDER BY reviewed_at DESC LIMIT 1) as last_got
          FROM cards c WHERE c.deck_id = ?
          ORDER BY misses DESC, c.box ASC, c.id ASC`,
    args: [deckId],
  });
  const cards: CardStat[] = cardsRes.rows.map((r) => ({
    id: Number(r.id),
    hanzi: String(r.hanzi),
    pinyin: r.pinyin === null ? null : String(r.pinyin),
    gloss: r.gloss === null ? null : String(r.gloss),
    box: Number(r.box),
    reviews: Number(r.reviews),
    misses: Number(r.misses),
    lastResult: r.last_got === null ? null : Number(r.last_got) === 1,
    lastReviewedAt:
      r.last_reviewed_at === null ? null : Number(r.last_reviewed_at),
  }));

  return { deck, tests, cards };
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadHistory(Number(id));
  if (!data) notFound();
  const { deck, tests, cards } = data;

  const troubled = cards.filter((c) => c.misses > 0).slice(0, 50);
  const untouched = cards.filter((c) => c.reviews === 0);
  const { main, sub } = splitDeckName(deck.name);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← {main}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <div className="mt-1 text-sm text-zinc-500">
        {main}
        {sub && (
          <span className="block text-xs text-zinc-400 dark:text-zinc-500">
            {sub}
          </span>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Tests
        </h2>
        {tests.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No tests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {tests.map((t) => (
              <li
                key={t.id}
                className={`rounded-md border px-4 py-3 text-sm ${
                  t.passed
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20"
                    : "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {t.passed
                      ? `🟢 Passed (${t.total_cards}/${t.total_cards})`
                      : `📚 ${t.total_cards - t.missed_count}/${t.total_cards} correct · ${t.missed_count} missed`}
                  </span>
                  <span className="text-zinc-500">
                    {formatDate(t.completed_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Trouble cards
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Cards you&rsquo;ve missed at least once, sorted by miss count.
        </p>
        {troubled.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            None — every reviewed card has been correct.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {troubled.map((c) => (
              <li key={c.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 text-base">{c.hanzi}</span>
                    {c.pinyin && (
                      <span className="shrink-0 text-xs text-zinc-500">
                        {c.pinyin}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-zinc-500">
                    {c.misses}× · box {c.box}
                  </span>
                </div>
                {c.gloss && (
                  <div className="mt-0.5 break-words text-zinc-700 dark:text-zinc-300">
                    {c.gloss}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {untouched.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Not yet reviewed
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {untouched.length} card{untouched.length === 1 ? "" : "s"} still
            untouched in this deck.
          </p>
        </section>
      )}
    </main>
  );
}
