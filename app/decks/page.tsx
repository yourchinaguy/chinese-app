import Link from "next/link";
import { db } from "@/lib/db";
import { getDeckStatuses, type DeckStatus } from "@/lib/deck-status";
import { RowDeleteButton } from "./RowDeleteButton";
import { RowRenameButton } from "./RowRenameButton";

export const dynamic = "force-dynamic";

type DeckRow = {
  id: number;
  name: string;
  deckType: "vocab" | "grammar";
  created_at: number;
  total: number;
  sourceId: number | null;
  sourceTitle: string | null;
  chunkIndex: number | null;
  chunkTotal: number | null;
};

// Most deck names follow a pattern like
//   '<source>：<topic>（HSK 4 改写） — grammar'
// We only need the leading 'source' for the list view; the rest is metadata
// already encoded in the badges. Trim at the first separator.
function shortName(name: string): string {
  const seps = ["：", "（", "(", " — ", " - "];
  let cut = name.length;
  for (const s of seps) {
    const i = name.indexOf(s);
    if (i > 0 && i < cut) cut = i;
  }
  return name.slice(0, cut).trim();
}

async function listDecks(): Promise<DeckRow[]> {
  const r = await db().execute({
    sql: `SELECT d.id, d.name, d.deck_type, d.created_at,
                 d.source_id, d.chunk_index, d.chunk_total,
                 s.title AS source_title,
                 COUNT(c.id) as total
          FROM decks d
          LEFT JOIN cards c ON c.deck_id = d.id
          LEFT JOIN sources s ON s.id = d.source_id
          GROUP BY d.id
          ORDER BY d.created_at DESC`,
    args: [],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    deckType: (String(row.deck_type ?? "vocab") === "grammar"
      ? "grammar"
      : "vocab") as "vocab" | "grammar",
    created_at: Number(row.created_at),
    total: Number(row.total),
    sourceId: row.source_id === null ? null : Number(row.source_id),
    sourceTitle: row.source_title === null ? null : String(row.source_title),
    chunkIndex: row.chunk_index === null ? null : Number(row.chunk_index),
    chunkTotal: row.chunk_total === null ? null : Number(row.chunk_total),
  }));
}

const STATUS_STYLE: Record<DeckStatus, string> = {
  waiting:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  studying:
    "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  done:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
};

type ListItem =
  | { kind: "single"; deck: DeckRow }
  | {
      kind: "group";
      sourceId: number;
      sourceTitle: string;
      decks: DeckRow[];
      latest: number;
    };

function buildItems(decks: DeckRow[]): ListItem[] {
  const groups = new Map<number, DeckRow[]>();
  const items: ListItem[] = [];
  for (const d of decks) {
    const isChunked =
      d.sourceId !== null && d.chunkTotal !== null && d.chunkTotal > 1;
    if (isChunked) {
      const existing = groups.get(d.sourceId!);
      if (existing) existing.push(d);
      else groups.set(d.sourceId!, [d]);
    } else {
      items.push({ kind: "single", deck: d });
    }
  }
  for (const [sourceId, list] of groups) {
    const latest = Math.max(...list.map((d) => d.created_at));
    list.sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
    items.push({
      kind: "group",
      sourceId,
      sourceTitle: list[0].sourceTitle ?? list[0].name,
      decks: list,
      latest,
    });
  }
  items.sort((a, b) => {
    const at = a.kind === "single" ? a.deck.created_at : a.latest;
    const bt = b.kind === "single" ? b.deck.created_at : b.latest;
    return bt - at;
  });
  return items;
}

export default async function DecksPage() {
  const decks = await listDecks();
  const statuses = await getDeckStatuses(
    db(),
    decks.map((d) => d.id),
  );
  const items = buildItems(decks);

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

      {items.length === 0 ? (
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
          {items.map((item) => {
            if (item.kind === "single") {
              const d = item.deck;
              const status = statuses.get(d.id) ?? "waiting";
              return (
                <li
                  key={`d-${d.id}`}
                  className="flex items-stretch gap-1 rounded-lg border border-zinc-200 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <Link
                    href={`/decks/${d.id}`}
                    title={d.name}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate font-medium">
                          {shortName(d.name)}
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
                        {d.total} cards
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
                    >
                      {status}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center pr-2">
                    <RowRenameButton deckId={d.id} deckName={d.name} />
                    <RowDeleteButton
                      deckId={d.id}
                      deckName={d.name}
                      cardCount={d.total}
                    />
                  </div>
                </li>
              );
            }

            const doneCount = item.decks.filter(
              (d) => statuses.get(d.id) === "done",
            ).length;
            const totalCards = item.decks.reduce(
              (sum, d) => sum + d.total,
              0,
            );
            return (
              <li
                key={`s-${item.sourceId}`}
                className="rounded-lg border border-zinc-200 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <Link
                  href={`/sources/${item.sourceId}`}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="min-w-0 truncate font-medium">
                      {shortName(item.sourceTitle)}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-500">
                      {totalCards} cards · {item.decks.length} parts ·{" "}
                      {doneCount}/{item.decks.length} done
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
