"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { characterBreakdown, splitCombinedGloss } from "@/lib/gloss";
import { usePinyinShown } from "@/lib/use-pinyin-shown";
import { submitReview } from "./actions";
import { OriginalVersionSection } from "./OriginalVersionSection";
import { PinyinToggle } from "./PinyinToggle";
import type { Card } from "./page";

const INLINE_LIMIT = 3;

export function Review({
  deck,
  cards,
  total,
  originalText,
  readyForOriginal,
  ageDays,
}: {
  deck: { id: number; name: string };
  cards: Card[];
  total: number;
  originalText: string | null;
  readyForOriginal: boolean;
  ageDays: number;
}) {
  // Freeze the deck on mount. Server-action revalidation re-renders this
  // component with a shorter cards array (the just-graded card is no longer
  // due), which would briefly show the wrong card mid-transition. The session
  // works off a stable snapshot.
  const [sessionCards] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [finished, setFinished] = useState(false);
  const [pinyinShown] = usePinyinShown();

  const current = sessionCards[idx];

  function grade(gotIt: boolean) {
    if (!current) return;
    startTransition(async () => {
      await submitReview(current.id, gotIt);
      if (idx + 1 < sessionCards.length) {
        setIdx(idx + 1);
        setRevealed(false);
      } else {
        setFinished(true);
      }
    });
  }

  if (finished) {
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
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-lg">Session done — {sessionCards.length} reviewed.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Words you got right won&rsquo;t show again until their interval ends
            (1 → 2 → 4 → 8 → 16 days). Anything you marked to keep studying
            comes back tomorrow.
          </p>
        </div>
        {originalText && (
          <OriginalVersionSection
            title={deck.name}
            originalText={originalText}
            ageDays={ageDays}
            ready={readyForOriginal}
          />
        )}
      </main>
    );
  }

  if (!current) return null;

  const progress = Math.round((idx / sessionCards.length) * 100);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/decks"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← decks
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {idx + 1} / {sessionCards.length} · box {current.box}
          </span>
          <PinyinToggle />
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 text-xs text-zinc-500">{deck.name} · {total} cards total</div>

      {originalText && readyForOriginal && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
          Ready for the original? Finish this session and we&rsquo;ll surface it
          at the end.
        </div>
      )}

      <div className="mt-8 flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-7xl font-medium tracking-wide sm:text-8xl">
            {current.hanzi}
          </div>
          {pinyinShown && current.pinyin && !revealed && (
            <div className="mt-3 text-xl text-zinc-500 dark:text-zinc-400">
              {current.pinyin}
            </div>
          )}

          {revealed && (
            <div className="mt-6 space-y-3">
              {current.pinyin && (
                <div className="text-2xl text-zinc-600 dark:text-zinc-400">
                  {current.pinyin}
                </div>
              )}
              <Meanings
                glosses={current.glosses}
                fallback={current.gloss}
                cardKey={current.id}
              />
              <CharacterBreakdown hanzi={current.hanzi} />
              {current.example_sentence && (
                <div className="mt-4 max-w-md rounded-md border border-zinc-200 p-3 text-base leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  <HighlightedSentence
                    sentence={current.example_sentence}
                    hanzi={current.hanzi}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-lg bg-zinc-900 px-5 py-5 text-lg font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Show
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => grade(false)}
            disabled={pending}
            className="rounded-lg border border-rose-300 bg-rose-50 px-5 py-5 text-lg font-medium text-rose-900 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-200"
          >
            Study
          </button>
          <button
            onClick={() => grade(true)}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-5 py-5 text-lg font-medium text-white disabled:opacity-50"
          >
            Got it
          </button>
        </div>
      )}
    </main>
  );
}

function HighlightedSentence({
  sentence,
  hanzi,
}: {
  sentence: string;
  hanzi: string;
}) {
  if (!hanzi) return <>{sentence}</>;
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  while (cursor < sentence.length) {
    const at = sentence.indexOf(hanzi, cursor);
    if (at === -1) {
      parts.push({ text: sentence.slice(cursor), match: false });
      break;
    }
    if (at > cursor) parts.push({ text: sentence.slice(cursor, at), match: false });
    parts.push({ text: hanzi, match: true });
    cursor = at + hanzi.length;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className="rounded bg-amber-200/70 px-0.5 font-medium text-amber-950 dark:bg-amber-500/30 dark:text-amber-100"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function Meanings({
  glosses,
  fallback,
  cardKey,
}: {
  glosses: string[];
  fallback: string | null;
  cardKey: number;
}) {
  const [showAll, setShowAll] = useState(false);
  // Reset the "show all" toggle whenever we move to a different card.
  useEffect(() => setShowAll(false), [cardKey]);

  // If HSK had nothing, try to split a combined gloss string (CC-CEDICT
  // style "; "-separated) so the learner sees every meaning, not just the
  // first one before the separator.
  const effective =
    glosses.length > 0 ? glosses : splitCombinedGloss(fallback);

  if (effective.length === 0) return null;
  if (effective.length === 1) {
    return (
      <div className="text-lg text-zinc-800 dark:text-zinc-200">
        {effective[0]}
      </div>
    );
  }

  const overflow = effective.length > INLINE_LIMIT;
  const visible = overflow && !showAll ? effective.slice(0, INLINE_LIMIT) : effective;

  return (
    <div className="mx-auto max-w-md text-left">
      <ol className="space-y-1 text-base text-zinc-800 dark:text-zinc-200">
        {visible.map((g, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-zinc-400 tabular-nums">{i + 1}.</span>
            <span>{g}</span>
          </li>
        ))}
      </ol>
      {overflow && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Show all {effective.length} meanings
        </button>
      )}
    </div>
  );
}

function CharacterBreakdown({ hanzi }: { hanzi: string }) {
  const parts = characterBreakdown(hanzi);
  if (parts.length === 0) return null;
  // Skip if no part has any HSK gloss — nothing useful to show.
  const hasAny = parts.some((p) => p.glosses.length > 0);
  if (!hasAny) return null;

  return (
    <div className="mx-auto mt-3 max-w-md rounded-md border border-zinc-200 bg-zinc-50 p-3 text-left text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-1 text-zinc-500">Character breakdown</div>
      <ul className="space-y-1">
        {parts.map((p, i) => (
          <li key={`${p.char}-${i}`} className="flex items-baseline gap-2">
            <span className="shrink-0 text-base text-zinc-800 dark:text-zinc-200">
              {p.char}
            </span>
            {p.entry?.pinyin && (
              <span className="shrink-0 text-zinc-500">{p.entry.pinyin}</span>
            )}
            <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
              {p.glosses[0] ?? "—"}
            </span>
            {p.entry?.level && (
              <span className="ml-auto shrink-0 text-zinc-400">
                HSK {p.entry.level}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
