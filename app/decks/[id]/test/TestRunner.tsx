"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { characterBreakdown, splitCombinedGloss } from "@/lib/gloss";
import { usePinyinShown } from "@/lib/use-pinyin-shown";
import { PinyinToggle } from "../PinyinToggle";
import { submitTest } from "./actions";

export type TestCard = {
  id: number;
  kind: "vocab" | "grammar";
  hanzi: string;
  pinyin: string | null;
  glosses: string[];
  gloss: string | null;
  example_sentence: string | null;
  matched_text: string | null;
  pattern: string | null;
  description: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TestRunner({
  deck,
  cards,
}: {
  deck: { id: number; name: string; deckType: "vocab" | "grammar" };
  cards: TestCard[];
}) {
  const [order] = useState(() => shuffle(cards));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [missed, setMissed] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const [pinyinShown] = usePinyinShown();

  const current = order[idx];
  const progress = Math.round((idx / order.length) * 100);

  function record(correct: boolean) {
    const nextMissed = correct ? missed : [...missed, current.id];
    if (idx + 1 < order.length) {
      setMissed(nextMissed);
      setIdx(idx + 1);
      setRevealed(false);
      return;
    }
    startTransition(async () => {
      await submitTest(deck.id, nextMissed, order.length);
    });
  }

  if (!current) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← {deck.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            test · {idx + 1} / {order.length}
          </span>
          <PinyinToggle />
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-indigo-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-zinc-500">
        Test mode — every miss spawns a study deck. Pass = 100% in one pass.
      </div>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          {current.kind === "grammar" && current.pattern ? (
            <div className="text-3xl font-medium tracking-wide sm:text-4xl">
              {current.pattern}
            </div>
          ) : (
            <div className="text-7xl font-medium tracking-wide sm:text-8xl">
              {current.hanzi}
            </div>
          )}
          {pinyinShown && current.pinyin && !revealed && (
            <div className="mt-3 text-xl text-zinc-500 dark:text-zinc-400">
              {current.pinyin}
            </div>
          )}

          {current.kind === "grammar" && current.example_sentence && (
            <div className="mt-4 max-w-md rounded-md border border-zinc-200 p-3 text-base leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
              {current.example_sentence}
            </div>
          )}

          {revealed && (
            <div className="mt-6 space-y-3">
              {current.pinyin && (
                <div className="text-2xl text-zinc-600 dark:text-zinc-400">
                  {current.pinyin}
                </div>
              )}
              {current.kind === "vocab" ? (
                <VocabMeanings
                  glosses={current.glosses}
                  fallback={current.gloss}
                  hanzi={current.hanzi}
                />
              ) : (
                <div className="space-y-2 text-base text-zinc-800 dark:text-zinc-200">
                  {current.gloss && <div className="font-medium">{current.gloss}</div>}
                  {current.description && (
                    <div className="text-zinc-700 dark:text-zinc-300">
                      {current.description}
                    </div>
                  )}
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
            onClick={() => record(false)}
            disabled={pending}
            className="rounded-lg border border-rose-300 bg-rose-50 px-5 py-5 text-lg font-medium text-rose-900 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-200"
          >
            Missed
          </button>
          <button
            onClick={() => record(true)}
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

function VocabMeanings({
  glosses,
  fallback,
  hanzi,
}: {
  glosses: string[];
  fallback: string | null;
  hanzi: string;
}) {
  const effective = glosses.length > 0 ? glosses : splitCombinedGloss(fallback);
  const parts = characterBreakdown(hanzi);
  const hasBreakdown = parts.some((p) => p.glosses.length > 0);

  return (
    <div className="space-y-3">
      {effective.length === 0 ? null : effective.length === 1 ? (
        <div className="text-lg text-zinc-800 dark:text-zinc-200">
          {effective[0]}
        </div>
      ) : (
        <ol className="mx-auto max-w-md space-y-1 text-left text-base text-zinc-800 dark:text-zinc-200">
          {effective.map((g, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-400 tabular-nums">{i + 1}.</span>
              <span>{g}</span>
            </li>
          ))}
        </ol>
      )}
      {hasBreakdown && (
        <div className="mx-auto max-w-md rounded-md border border-zinc-200 bg-zinc-50 p-3 text-left text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-1 text-zinc-500">Character breakdown</div>
          <ul className="space-y-1">
            {parts.map((p, i) => (
              <li key={`${p.char}-${i}`} className="flex items-baseline gap-2">
                <span className="shrink-0 text-base text-zinc-800 dark:text-zinc-200">
                  {p.char}
                </span>
                {p.entry?.pinyin && (
                  <span className="shrink-0 text-zinc-500">
                    {p.entry.pinyin}
                  </span>
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
      )}
    </div>
  );
}
