import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDeckStatuses, type DeckStatus } from "@/lib/deck-status";

export const dynamic = "force-dynamic";

type DeckRow = {
  id: number;
  name: string;
  deckType: "vocab" | "grammar";
  chunkIndex: number | null;
  chunkTotal: number | null;
  cardCount: number;
};

type SourceData = {
  id: number;
  title: string;
  kind: string;
  decks: DeckRow[];
  statuses: Map<number, DeckStatus>;
  totalCards: number;
};

async function loadSource(id: number): Promise<SourceData | null> {
  const client = db();
  const sourceRes = await client.execute({
    sql: "SELECT id, title, kind FROM sources WHERE id = ?",
    args: [id],
  });
  if (sourceRes.rows.length === 0) return null;
  const row = sourceRes.rows[0];

  const decksRes = await client.execute({
    sql: `SELECT d.id, d.name, d.deck_type, d.chunk_index, d.chunk_total,
                 (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
          FROM decks d
          WHERE d.source_id = ?
          ORDER BY
            d.deck_type ASC,
            CASE WHEN d.chunk_index IS NULL THEN 1 ELSE 0 END,
            d.chunk_index ASC,
            d.created_at ASC`,
    args: [id],
  });
  const decks: DeckRow[] = decksRes.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    deckType:
      String(r.deck_type ?? "vocab") === "grammar" ? "grammar" : "vocab",
    chunkIndex: r.chunk_index === null ? null : Number(r.chunk_index),
    chunkTotal: r.chunk_total === null ? null : Number(r.chunk_total),
    cardCount: Number(r.card_count),
  }));

  const statuses = await getDeckStatuses(
    client,
    decks.map((d) => d.id),
  );
  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);

  return {
    id: Number(row.id),
    title: String(row.title),
    kind: String(row.kind),
    decks,
    statuses,
    totalCards,
  };
}

const STATUS_STYLE: Record<DeckStatus, string> = {
  waiting:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  studying:
    "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  done:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export default async function SourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadSource(Number(id));
  if (!data) notFound();

  const doneCount = Array.from(data.statuses.values()).filter(
    (s) => s === "done",
  ).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/decks"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← decks
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
      <div className="mt-1 text-sm text-zinc-500">
        {data.totalCards} cards · {data.decks.length} deck
        {data.decks.length === 1 ? "" : "s"} · {doneCount}/{data.decks.length}{" "}
        done
      </div>

      {data.decks.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            No decks under this source yet.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {data.decks.map((d) => {
            const status = data.statuses.get(d.id) ?? "waiting";
            return (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-200 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <Link
                  href={`/decks/${d.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate font-medium">
                        {d.chunkIndex && d.chunkTotal
                          ? `Part ${d.chunkIndex} / ${d.chunkTotal}`
                          : d.name}
                      </span>
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
                      {d.cardCount} cards
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
                  >
                    {status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
