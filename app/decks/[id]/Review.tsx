"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitReview } from "./actions";
import type { Card } from "./page";

export function Review({
  deck,
  cards,
  total,
}: {
  deck: { id: number; name: string };
  cards: Card[];
  total: number;
}) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [finished, setFinished] = useState(false);

  const current = cards[idx];

  function grade(gotIt: boolean) {
    if (!current) return;
    startTransition(async () => {
      await submitReview(current.id, gotIt);
      if (idx + 1 < cards.length) {
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
          <p className="text-lg">Session done — {cards.length} reviewed.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Words you got right won&rsquo;t show again until their interval ends
            (1 → 2 → 4 → 8 → 16 days). Misses come back tomorrow.
          </p>
        </div>
      </main>
    );
  }

  if (!current) return null;

  const progress = Math.round((idx / cards.length) * 100);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/decks"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← decks
        </Link>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {idx + 1} / {cards.length} · box {current.box}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 text-xs text-zinc-500">{deck.name} · {total} cards total</div>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-7xl font-medium tracking-wide sm:text-8xl">
            {current.hanzi}
          </div>

          {revealed && (
            <div className="mt-6 space-y-2">
              {current.pinyin && (
                <div className="text-2xl text-zinc-600 dark:text-zinc-400">
                  {current.pinyin}
                </div>
              )}
              {current.gloss && (
                <div className="text-lg text-zinc-800 dark:text-zinc-200">
                  {current.gloss}
                </div>
              )}
              {current.example_sentence && (
                <div className="mt-4 max-w-md rounded-md border border-zinc-200 p-3 text-base leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  {current.example_sentence}
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
            Missed
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
