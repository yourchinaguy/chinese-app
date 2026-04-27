import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { grammarPointById, wikiUrlFor } from "@/data/grammar-points";
import { cleanTranslations, getHskEntry } from "@/lib/hsk";
import {
  getDeckProgress,
  getDeckStatus,
  type DeckProgress,
  type DeckStatus,
} from "@/lib/deck-status";
import { DeckTitle } from "./DeckTitle";
import { DeleteButton } from "./DeleteButton";
import { GrammarReview, type GrammarCard } from "./GrammarReview";
import { OriginalVersionSection } from "./OriginalVersionSection";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

const ORIGINAL_PROMPT_AFTER_DAYS = 14;

export type Deck = {
  id: number;
  name: string;
  deckType: "vocab" | "grammar";
  sourceId?: number | null;
};

export type Card = {
  id: number;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  glosses: string[];
  hsk_level: number | null;
  example_sentence: string | null;
  box: number;
  due_at: number;
};

type StudyMode = "due" | "missed" | "all" | "right";

function parseMode(raw: string | undefined): StudyMode {
  return raw === "missed" || raw === "all" || raw === "right" ? raw : "due";
}

// Pick the SQL clause for the chosen study mode. All modes return the same
// columns and ordering — only the WHERE clause changes.
function modeQuery(deckId: number, mode: StudyMode): { sql: string; args: (string | number)[] } {
  const cols = `id, hanzi, pinyin, gloss, hsk_level, example_sentence, box, due_at,
                grammar_point_id, matched_text`;
  if (mode === "all") {
    return {
      sql: `SELECT ${cols} FROM cards WHERE deck_id = ? ORDER BY box ASC, id ASC`,
      args: [deckId],
    };
  }
  if (mode === "missed") {
    return {
      sql: `SELECT ${cols} FROM cards c WHERE c.deck_id = ?
            AND (
              SELECT got_it FROM reviews r
              WHERE r.card_id = c.id
              ORDER BY r.reviewed_at DESC LIMIT 1
            ) = 0
            ORDER BY box ASC, id ASC`,
      args: [deckId],
    };
  }
  if (mode === "right") {
    return {
      sql: `SELECT ${cols} FROM cards c WHERE c.deck_id = ?
            AND (
              SELECT got_it FROM reviews r
              WHERE r.card_id = c.id
              ORDER BY r.reviewed_at DESC LIMIT 1
            ) = 1
            ORDER BY box ASC, id ASC`,
      args: [deckId],
    };
  }
  return {
    sql: `SELECT ${cols} FROM cards
          WHERE deck_id = ? AND due_at <= ?
          ORDER BY box ASC, due_at ASC`,
    args: [deckId, Math.floor(Date.now() / 1000)],
  };
}

async function loadDeck(id: number, mode: StudyMode = "due") {
  const client = db();
  const deckRes = await client.execute({
    sql: `SELECT d.id, d.name, d.deck_type, d.created_at, d.source_id,
                 s.original_text
          FROM decks d
          LEFT JOIN sources s ON s.id = d.source_id
          WHERE d.id = ?`,
    args: [id],
  });
  if (deckRes.rows.length === 0) return null;
  const deckType =
    String(deckRes.rows[0].deck_type ?? "vocab") === "grammar"
      ? "grammar"
      : "vocab";
  const sourceId =
    deckRes.rows[0].source_id === null
      ? null
      : Number(deckRes.rows[0].source_id);
  const deck: Deck = {
    id: Number(deckRes.rows[0].id),
    name: String(deckRes.rows[0].name),
    deckType,
    sourceId,
  };
  const createdAt = Number(deckRes.rows[0].created_at);
  const originalText =
    deckRes.rows[0].original_text === null
      ? null
      : String(deckRes.rows[0].original_text);
  const ageDays = Math.floor(
    (Math.floor(Date.now() / 1000) - createdAt) / 86400,
  );

  const dueRes = await client.execute(modeQuery(id, mode));
  const totalRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM cards WHERE deck_id = ?",
    args: [id],
  });
  const reviewedRes = await client.execute({
    sql: `SELECT COUNT(DISTINCT c.id) as c FROM cards c
          JOIN reviews r ON r.card_id = c.id
          WHERE c.deck_id = ?`,
    args: [id],
  });
  const reviewedCount = Number(reviewedRes.rows[0].c ?? 0);
  const status = await getDeckStatus(client, id);
  const progress = await getDeckProgress(client, id);

  if (deckType === "grammar") {
    const due: GrammarCard[] = [];
    for (const row of dueRes.rows) {
      const pointId = String(row.grammar_point_id ?? row.hanzi ?? "");
      const point = grammarPointById(pointId);
      if (!point) continue; // grammar point was deleted from data file
      due.push({
        id: Number(row.id),
        pointId,
        name: point.name,
        patternZh: point.patternZh,
        cefr: point.cefr,
        approxHsk: point.approxHsk,
        description: point.description,
        wikiUrl: wikiUrlFor(point),
        sentence: String(row.example_sentence ?? ""),
        matchedText: String(row.matched_text ?? ""),
        box: Number(row.box),
        due_at: Number(row.due_at),
      });
    }
    return {
      deck,
      due,
      total: Number(totalRes.rows[0].c),
      reviewedCount,
      status,
      progress,
      kind: "grammar" as const,
      originalText,
      ageDays,
    };
  }

  const due: Card[] = dueRes.rows.map((row) => {
    const hanzi = String(row.hanzi);
    const glosses = cleanTranslations(getHskEntry(hanzi));
    return {
      id: Number(row.id),
      hanzi,
      pinyin: row.pinyin === null ? null : String(row.pinyin),
      gloss: row.gloss === null ? null : String(row.gloss),
      glosses,
      hsk_level: row.hsk_level === null ? null : Number(row.hsk_level),
      example_sentence:
        row.example_sentence === null ? null : String(row.example_sentence),
      box: Number(row.box),
      due_at: Number(row.due_at),
    };
  });
  return {
    deck,
    due,
    total: Number(totalRes.rows[0].c),
    reviewedCount,
    status,
    progress,
    kind: "vocab" as const,
    originalText,
    ageDays,
  };
}

function formatRelative(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDueIn(unix: number): string {
  const diff = unix - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "now";
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`;
  return `in ${Math.floor(diff / 86400)}d`;
}

function ProgressStats({ progress }: { progress: DeckProgress }) {
  const total = progress.total;
  const gotRightPct = total > 0 ? Math.round((progress.gotRight / total) * 100) : 0;
  const needWorkPct = total > 0 ? Math.round((progress.needWork / total) * 100) : 0;
  return (
    <div className="mt-4 space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-medium">Got right</span>
          <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
            {progress.gotRight} / {total} ({gotRightPct}%)
          </span>
        </div>
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-emerald-500" style={{ width: `${gotRightPct}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${needWorkPct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Got right" value={String(progress.gotRight)} tone="ok" />
        <Stat label="Need work" value={String(progress.needWork)} tone="warn" />
        <Stat label="To review" value={String(progress.stillToLearn)} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Reviewed" value={`${progress.reviewedCount} / ${total}`} />
        <Stat
          label={progress.dueNow > 0 ? "Due now" : "Next due"}
          value={
            progress.dueNow > 0
              ? String(progress.dueNow)
              : progress.nextDueAt
                ? formatDueIn(progress.nextDueAt)
                : "—"
          }
        />
      </div>
      <div className="space-y-0.5 text-xs text-zinc-500">
        {progress.lastReviewedAt && (
          <div>Last studied {formatRelative(progress.lastReviewedAt)}</div>
        )}
        {progress.mastered > 0 && (
          <div>
            🟢 {progress.mastered} graduated to mastered (5 in a row)
          </div>
        )}
        {progress.latestTest && (
          <div>
            Last test{" "}
            {progress.latestTest.passed
              ? "🟢 passed"
              : `📚 ${progress.latestTest.totalCards - progress.latestTest.missedCount}/${progress.latestTest.totalCards}`}
            {" · "}
            {formatRelative(progress.latestTest.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillLink({
  deckId,
  mode,
  label,
  count,
  tone,
}: {
  deckId: number;
  mode: "missed" | "right" | "all";
  label: string;
  count: number;
  tone?: "ok" | "warn";
}) {
  const disabled = count === 0;
  const base =
    "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition";
  const palette = disabled
    ? "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600 cursor-not-allowed"
    : tone === "warn"
      ? "border-rose-300 text-rose-900 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-900/20"
      : tone === "ok"
        ? "border-emerald-300 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
        : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700";
  if (disabled) {
    return (
      <span className={`${base} ${palette}`}>
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-xs">0</span>
      </span>
    );
  }
  return (
    <Link href={`/decks/${deckId}?mode=${mode}`} className={`${base} ${palette}`}>
      <span className="font-medium">{label}</span>
      <span className="tabular-nums text-xs">{count}</span>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "text-rose-700 dark:text-rose-400"
        : "";
  return (
    <div className="flex items-baseline justify-between rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-zinc-500">{label}</span>
      <span className={`tabular-nums font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

const STATUS_STYLE: Record<DeckStatus, string> = {
  waiting:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  studying:
    "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  done:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const mode = parseMode(sp.mode);
  const data = await loadDeck(Number(id), mode);
  if (!data) notFound();

  const { deck, due, total, reviewedCount, status, progress, originalText, ageDays } = data;
  const ready = ageDays >= ORIGINAL_PROMPT_AFTER_DAYS;
  const testReady = total > 0 && reviewedCount >= total;

  // Empty result on a non-default mode — show a "nothing to drill" notice
  // instead of bouncing back to the SRS caught-up screen.
  if (due.length === 0 && mode !== "due") {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-6">
          <Link
            href={`/decks/${deck.id}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← {deck.name}
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-lg">No cards in this set.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "missed"
              ? "You haven't missed any cards yet."
              : mode === "right"
                ? "You haven't gotten any cards right yet."
                : "This deck is empty."}
          </p>
        </div>
      </main>
    );
  }

  if (due.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/decks"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← decks
          </Link>
        </div>
        <DeckTitle deckId={deck.id} name={deck.name} sourceId={deck.sourceId} />
        <div className="mt-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
          >
            {status}
          </span>
        </div>

        {status === "done" ? (
          <div className="mt-10 rounded-lg border border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-900/20">
            <div className="text-3xl">🟢</div>
            <p className="mt-3 text-lg font-medium">Done — passed in one pass.</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {total} cards in this deck. You can re-test anytime to keep it sharp.
            </p>
            <Link
              href={`/decks/${deck.id}/test`}
              className="mt-6 inline-block rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
            >
              Re-test
            </Link>
          </div>
        ) : (
          <>
            <ProgressStats progress={progress} />
            <div className="mt-6 rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <p className="text-lg">You&rsquo;re caught up.</p>
              <p className="mt-1 text-sm text-zinc-500">
                {progress.dueNow === 0 && progress.nextDueAt
                  ? `Next card due ${formatDueIn(progress.nextDueAt)}.`
                  : `${total} cards · ${reviewedCount}/${total} reviewed.`}
              </p>
              {testReady ? (
                <Link
                  href={`/decks/${deck.id}/test`}
                  className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Test the deck →
                </Link>
              ) : (
                <p className="mt-6 text-xs text-zinc-500">
                  Test unlocks once every card has been reviewed at least once.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-sm font-medium">Drill the deck</div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Practice between SRS intervals. Reviews still count — misses
                drop a card to box 1, hits advance the box.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <DrillLink
                  deckId={deck.id}
                  mode="missed"
                  label="Missed only"
                  count={progress.needWork}
                  tone="warn"
                />
                <DrillLink
                  deckId={deck.id}
                  mode="right"
                  label="Got-right only"
                  count={progress.gotRight}
                  tone="ok"
                />
                <DrillLink
                  deckId={deck.id}
                  mode="all"
                  label="Whole deck"
                  count={total}
                />
              </div>
            </div>
          </>
        )}

        {originalText && (
          <OriginalVersionSection
            title={deck.name}
            originalText={originalText}
            ageDays={ageDays}
            ready={ready}
          />
        )}
        <div className="mt-10 flex items-center justify-between">
          <Link
            href={`/decks/${deck.id}/history`}
            className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            History →
          </Link>
          <DeleteButton deckId={deck.id} deckName={deck.name} cardCount={total} />
        </div>
      </main>
    );
  }

  if (data.kind === "grammar") {
    return (
      <GrammarReview
        deck={deck}
        cards={data.due}
        total={total}
        originalText={originalText}
        readyForOriginal={ready}
        ageDays={ageDays}
      />
    );
  }
  return (
    <Review
      deck={deck}
      cards={data.due}
      total={total}
      originalText={originalText}
      readyForOriginal={ready}
      ageDays={ageDays}
    />
  );
}
