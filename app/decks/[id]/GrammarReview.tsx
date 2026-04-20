"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitReview } from "./actions";
import type { Deck } from "./page";

export type GrammarCard = {
  id: number;
  pointId: string;
  name: string;
  patternZh: string;
  cefr: string;
  approxHsk: number;
  description: string;
  wikiUrl: string;
  sentence: string;
  matchedText: string;
  box: number;
  due_at: number;
};

export function GrammarReview({
  deck,
  cards,
  total,
}: {
  deck: Deck;
  cards: GrammarCard[];
  total: number;
}) {
  const [sessionCards] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [finished, setFinished] = useState(false);

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
          <p className="text-lg">
            Session done — {sessionCards.length} grammar points reviewed.
          </p>
        </div>
      </main>
    );
  }

  if (!current) return null;

  const progress = Math.round((idx / sessionCards.length) * 100);

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
          {idx + 1} / {sessionCards.length} · box {current.box}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-violet-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        {deck.name} · {total} grammar points total
      </div>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center">
        <div className="w-full text-center">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            What grammar pattern is in this sentence?
          </div>
          <blockquote className="mt-4 rounded-md border-l-2 border-violet-400 bg-white px-4 py-3 text-left text-lg leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <Highlight
              sentence={current.sentence}
              matchedText={current.matchedText}
            />
          </blockquote>

          {revealed && (
            <div className="mt-8 space-y-3 text-left">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-lg font-medium">{current.name}</div>
                  <div className="text-base text-violet-900 dark:text-violet-200">
                    {current.patternZh}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 text-xs text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                    {current.cefr}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                    ~HSK {current.approxHsk}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {current.description}
              </p>
              <a
                href={current.wikiUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-violet-700 underline hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
              >
                Read more on Chinese Grammar Wiki →
              </a>
            </div>
          )}
        </div>
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-lg bg-zinc-900 px-5 py-5 text-lg font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Show pattern
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
            className="rounded-lg bg-violet-600 px-5 py-5 text-lg font-medium text-white disabled:opacity-50"
          >
            Got it
          </button>
        </div>
      )}
    </main>
  );
}

function Highlight({
  sentence,
  matchedText,
}: {
  sentence: string;
  matchedText: string;
}) {
  if (!matchedText) return <>{sentence}</>;
  const at = sentence.indexOf(matchedText);
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      <span>{sentence.slice(0, at)}</span>
      <mark className="rounded bg-violet-200/80 px-0.5 font-medium text-violet-950 dark:bg-violet-500/40 dark:text-violet-100">
        {matchedText}
      </mark>
      <span>{sentence.slice(at + matchedText.length)}</span>
    </>
  );
}
