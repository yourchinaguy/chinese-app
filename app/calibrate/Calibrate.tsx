"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createBaselineDeck, saveCalibration } from "./actions";
import { cleanTranslations, getHskEntry, type HskEntry, type HskLevel } from "@/lib/hsk";

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
  const known = answers.filter((a) => a.known);
  const missed = answers.filter((a) => !a.known);
  const [creating, startCreating] = useTransition();

  function createBaseline() {
    if (missed.length === 0) return;
    startCreating(async () => {
      await createBaselineDeck(missed.map((a) => a.entry.hanzi));
    });
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Calibration complete</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        You recognized {known.length} of {answers.length} words.
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

      <CadencePlan inferredLevel={stats.inferredLevel} />

      {missed.length > 0 && (
        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/10">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-base font-medium">
                Words you didn&rsquo;t know ({missed.length})
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Make a deck out of these to start studying them right away.
              </p>
            </div>
            <button
              onClick={createBaseline}
              disabled={creating}
              className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create baseline deck →"}
            </button>
          </div>
          <WordGrid answers={missed} />
        </section>
      )}

      {known.length > 0 && (
        <details className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Words you knew ({known.length})
          </summary>
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <WordGrid answers={known} />
          </div>
        </details>
      )}

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

function CadencePlan({ inferredLevel }: { inferredLevel: HskLevel }) {
  const target = Math.min(6, inferredLevel + 1) as HskLevel;
  let cadence: string;
  if (inferredLevel <= 2) {
    cadence = "Aim for 5–10 new cards per day. Build the daily habit first; speed comes later.";
  } else if (inferredLevel <= 4) {
    cadence = "Aim for 10–15 new cards per day, plus reviews of older cards. ~15 minutes total.";
  } else {
    cadence = "10–15 new cards per day from real content (articles, podcasts). Reviews will dominate as the deck grows; ~20–30 min/day total.";
  }
  return (
    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/10">
      <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Suggested plan
      </div>
      <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
        Push into <strong>HSK {target}</strong> content. {cadence}
      </p>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        On import, the app will auto-target HSK {target} words from whatever you paste.
      </p>
    </div>
  );
}

function WordGrid({ answers }: { answers: Answer[] }) {
  const sorted = [...answers].sort((a, b) => a.entry.level - b.entry.level);
  return (
    <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
      {sorted.map((a) => {
        const entry = getHskEntry(a.entry.hanzi);
        const glosses = cleanTranslations(entry);
        const meaning = glosses.slice(0, 2).join(" · ") || a.entry.translations[0];
        return (
          <li key={a.entry.hanzi} className="flex items-baseline gap-3 text-sm">
            <span className="shrink-0 whitespace-nowrap text-lg leading-tight">
              {a.entry.hanzi}
            </span>
            <div className="min-w-0 flex-1">
              <span className="mr-2 whitespace-nowrap text-xs text-zinc-500">
                {a.entry.pinyin}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">{meaning}</span>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-zinc-400">
              HSK {a.entry.level}
            </span>
          </li>
        );
      })}
    </ul>
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
