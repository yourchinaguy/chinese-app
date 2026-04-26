"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  poolSnapshot,
  submitRetest,
  type RetestResult,
  type SubmitRetestSummary,
} from "./actions";
import {
  type RetestPool,
  type RetestPoolId,
  type RetestWord,
} from "@/lib/retest";

type Phase =
  | { kind: "picking" }
  | { kind: "loading"; pool: RetestPoolId }
  | { kind: "quizzing"; pool: RetestPoolId; words: RetestWord[] }
  | {
      kind: "done";
      pool: RetestPoolId;
      words: RetestWord[];
      results: RetestResult[];
      summary: SubmitRetestSummary;
    };

export function RetestClient({
  pools,
  sizes,
}: {
  pools: RetestPool[];
  sizes: Record<RetestPoolId, number>;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "picking" });
  const [pending, startTransition] = useTransition();

  function start(pool: RetestPoolId) {
    setPhase({ kind: "loading", pool });
    startTransition(async () => {
      const snap = await poolSnapshot(pool);
      if (snap.words.length === 0) {
        setPhase({ kind: "picking" });
        alert("That pool has no words yet.");
        return;
      }
      setPhase({ kind: "quizzing", pool, words: snap.words });
    });
  }

  function finish(words: RetestWord[], results: RetestResult[], pool: RetestPoolId) {
    startTransition(async () => {
      const summary = await submitRetest(pool, results);
      setPhase({ kind: "done", pool, words, results, summary });
    });
  }

  if (phase.kind === "picking" || phase.kind === "loading") {
    return (
      <PoolPicker
        pools={pools}
        sizes={sizes}
        onPick={start}
        loadingPool={phase.kind === "loading" ? phase.pool : null}
      />
    );
  }

  if (phase.kind === "quizzing") {
    return (
      <Quiz
        words={phase.words}
        onFinish={(results) => finish(phase.words, results, phase.pool)}
        submitting={pending}
      />
    );
  }

  return (
    <Results
      pool={phase.pool}
      words={phase.words}
      results={phase.results}
      summary={phase.summary}
      onRetake={() => setPhase({ kind: "picking" })}
    />
  );
}

function PoolPicker({
  pools,
  sizes,
  onPick,
  loadingPool,
}: {
  pools: RetestPool[];
  sizes: Record<RetestPoolId, number>;
  onPick: (pool: RetestPoolId) => void;
  loadingPool: RetestPoolId | null;
}) {
  return (
    <ul className="mt-8 space-y-3">
      {pools.map((p) => {
        const size = sizes[p.id];
        const enabled = size > 0 && loadingPool === null;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => enabled && onPick(p.id)}
              disabled={!enabled}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-5 py-4 text-left transition ${
                enabled
                  ? "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  : "border-zinc-200 opacity-50 dark:border-zinc-800"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.label}</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.description}
                </div>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">
                {loadingPool === p.id
                  ? "loading…"
                  : size === 0
                    ? "empty"
                    : `${size} words available`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Quiz({
  words,
  onFinish,
  submitting,
}: {
  words: RetestWord[];
  onFinish: (results: RetestResult[]) => void;
  submitting: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RetestResult[]>([]);

  const current = words[idx];
  if (!current) return null;
  const progress = Math.round((idx / words.length) * 100);

  function answer(known: boolean) {
    const next = [...results, { hanzi: current.hanzi, known }];
    setResults(next);
    if (idx + 1 < words.length) {
      setIdx(idx + 1);
    } else {
      onFinish(next);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
        <span>
          Word {idx + 1} of {words.length}
        </span>
        <span>{results.filter((r) => r.known).length} known so far</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-16 flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-7xl font-medium tracking-wide sm:text-8xl">
          {current.hanzi}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          disabled={submitting}
          className="rounded-lg border border-zinc-300 px-5 py-5 text-lg font-medium transition hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          Not sure
        </button>
        <button
          onClick={() => answer(true)}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-5 py-5 text-lg font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Know it
        </button>
      </div>
      {submitting && (
        <p className="mt-4 text-center text-sm text-zinc-500">Saving…</p>
      )}
    </div>
  );
}

function Results({
  pool,
  words,
  results,
  summary,
  onRetake,
}: {
  pool: RetestPoolId;
  words: RetestWord[];
  results: RetestResult[];
  summary: SubmitRetestSummary;
  onRetake: () => void;
}) {
  const wordByHanzi = new Map(words.map((w) => [w.hanzi, w]));
  const missed = results
    .filter((r) => !r.known)
    .map((r) => wordByHanzi.get(r.hanzi))
    .filter((w): w is RetestWord => !!w);
  const knownPct = Math.round((summary.knownCount / summary.total) * 100);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold">Done.</h2>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        {summary.knownCount} of {summary.total} known ({knownPct}%) on the{" "}
        <em>{pool}</em> pool.
      </p>

      {summary.missedCount > 0 && summary.retestDeckId !== null && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/10">
          <div className="font-medium">
            {summary.missedCount} word{summary.missedCount === 1 ? "" : "s"} added
            to your &ldquo;Retest misses&rdquo; deck
          </div>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            Already-present words got their SRS reset to box 1. Open the deck to
            study them now.
          </p>
          <Link
            href={`/decks/${summary.retestDeckId}`}
            className="mt-3 inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Go to Retest misses deck →
          </Link>
        </div>
      )}

      {missed.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            What you missed
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            {missed.map((w) => (
              <li key={w.hanzi} className="flex items-baseline gap-3">
                <span className="text-base">{w.hanzi}</span>
                <span className="text-xs text-zinc-500">{w.pinyin ?? "—"}</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {w.gloss ?? "—"}
                </span>
                {w.hskLevel && (
                  <span className="ml-auto text-xs text-zinc-400">
                    HSK {w.hskLevel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex gap-3">
        <button
          onClick={onRetake}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Retest another pool
        </button>
        <Link
          href="/decks"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Back to decks
        </Link>
      </div>
    </div>
  );
}
