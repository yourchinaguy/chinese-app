"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveCalibration } from "./actions";
import type { HskEntry, HskLevel } from "@/lib/hsk";

type Answer = { entry: HskEntry; known: boolean };

export function Calibrate({
  words,
  alreadyKnownCount,
}: {
  words: HskEntry[];
  alreadyKnownCount: number;
}) {
  const [started, setStarted] = useState(alreadyKnownCount === 0);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const [saving, startSaving] = useTransition();

  const current = words[idx];

  function answer(isKnown: boolean) {
    if (!current) return;
    const next = [...answers, { entry: current, known: isKnown }];
    setAnswers(next);
    if (idx + 1 < words.length) {
      setIdx(idx + 1);
    } else {
      startSaving(async () => {
        const known = next.filter((a) => a.known).map((a) => a.entry.hanzi);
        await saveCalibration(known);
        setDone(true);
      });
    }
  }

  if (!started) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Already calibrated</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          You already have {alreadyKnownCount} words in your known-word set.
          Retaking the calibration will add to it (words you mark as known are
          merged; words you don&rsquo;t mark are left as-is).
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setStarted(true)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Retake calibration
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Back home
          </Link>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Summary answers={answers} />
      </Shell>
    );
  }

  if (!current) return null;

  const progressPct = Math.round((idx / words.length) * 100);
  const knownSoFar = answers.filter((a) => a.known).length;

  return (
    <Shell>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
        <span>
          Word {idx + 1} of {words.length}
        </span>
        <span>
          {knownSoFar} known so far
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-16 flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-7xl font-medium tracking-wide sm:text-8xl">
            {current.hanzi}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          disabled={saving}
          className="rounded-lg border border-zinc-300 px-5 py-5 text-lg font-medium transition hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          Not sure
        </button>
        <button
          onClick={() => answer(true)}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-5 py-5 text-lg font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Know it
        </button>
      </div>
      {saving && (
        <p className="mt-4 text-center text-sm text-zinc-500">Saving…</p>
      )}
    </Shell>
  );
}

function Summary({ answers }: { answers: Answer[] }) {
  const stats = useMemo(() => computeStats(answers), [answers]);
  const known = answers.filter((a) => a.known).length;

  return (
    <>
      <h1 className="text-2xl font-semibold">Calibration complete</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        You recognized {known} of {answers.length} words.
      </p>

      <div className="mt-6 space-y-2">
        {([1, 2, 3, 4, 5, 6] as HskLevel[]).map((lvl) => {
          const s = stats.byLevel[lvl];
          const pct = s.total > 0 ? Math.round((s.known / s.total) * 100) : 0;
          return (
            <div key={lvl} className="flex items-center gap-3">
              <span className="w-16 text-sm">HSK {lvl}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-20 text-right text-sm tabular-nums text-zinc-500">
                {s.known}/{s.total} · {pct}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Inferred level
        </div>
        <div className="mt-1 text-3xl font-semibold">HSK {stats.inferredLevel}</div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The highest level where you recognized ≥70% of sampled words.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/import"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Import content →
        </Link>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Back home
        </Link>
      </div>
    </>
  );
}

function computeStats(answers: Answer[]) {
  const byLevel: Record<HskLevel, { known: number; total: number }> = {
    1: { known: 0, total: 0 },
    2: { known: 0, total: 0 },
    3: { known: 0, total: 0 },
    4: { known: 0, total: 0 },
    5: { known: 0, total: 0 },
    6: { known: 0, total: 0 },
  };
  for (const a of answers) {
    const lvl = a.entry.level;
    byLevel[lvl].total++;
    if (a.known) byLevel[lvl].known++;
  }
  let inferredLevel: HskLevel = 1;
  for (const lvl of [1, 2, 3, 4, 5, 6] as HskLevel[]) {
    const s = byLevel[lvl];
    const pct = s.total > 0 ? s.known / s.total : 0;
    if (pct >= 0.7) inferredLevel = lvl;
  }
  return { byLevel, inferredLevel };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>
      {children}
    </main>
  );
}
