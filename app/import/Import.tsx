"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { analyzeText, createDeck } from "./actions";
import type { GradeResult, GradedWord, Verdict } from "@/lib/grade";
import type { HskLevel } from "@/lib/hsk";

type Kind = "article" | "transcript" | "other";

const verdictStyles: Record<Verdict, string> = {
  KNOWN: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  TARGET: "bg-amber-200 text-amber-950 font-medium dark:bg-amber-500/40 dark:text-amber-100",
  TOO_HARD: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  BEYOND_HSK: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

type Prefill = { text: string; title: string; kind: Kind };

export function Import({
  defaultLevel,
  prefill,
}: {
  defaultLevel: HskLevel;
  prefill?: Prefill;
}) {
  const [text, setText] = useState(prefill?.text ?? "");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [kind, setKind] = useState<Kind>(prefill?.kind ?? "article");
  const [level, setLevel] = useState<HskLevel>(defaultLevel);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, startAnalyzing] = useTransition();
  const [creating, startCreating] = useTransition();

  function analyze() {
    startAnalyzing(async () => {
      const r = await analyzeText(text, level);
      setResult(r);
      // Default-select all TARGET words
      const defaults = new Set<string>();
      const seen = new Set<string>();
      for (const g of r.graded) {
        if (seen.has(g.hanzi)) continue;
        seen.add(g.hanzi);
        if (g.verdict === "TARGET") defaults.add(g.hanzi);
      }
      setSelected(defaults);
    });
  }

  function toggle(hanzi: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hanzi)) next.delete(hanzi);
      else next.add(hanzi);
      return next;
    });
  }

  function create() {
    if (!result) return;
    startCreating(async () => {
      await createDeck({
        title: title.trim() || "Untitled deck",
        kind,
        text,
        selectedHanzi: Array.from(selected),
      });
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Import content</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Paste a blog post, textbook lesson, podcast transcript, or any other
        Chinese text. The app filters to words just above your level and makes
        them a deck.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Podcast — AI in China ep 42"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="article">Article / blog post</option>
              <option value="transcript">Podcast transcript</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Your HSK level: {level}</span>
            <input
              type="range"
              min={1}
              max={6}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as HskLevel)}
              className="mt-2 w-full"
            />
          </label>
        </div>


        <label className="block">
          <span className="text-sm font-medium">Chinese text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="粘贴中文内容…"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-3 text-base leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          onClick={analyze}
          disabled={analyzing || !text.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {result && (
        <Analysis
          result={result}
          selected={selected}
          toggle={toggle}
          create={create}
          creating={creating}
        />
      )}
    </main>
  );
}

function Analysis({
  result,
  selected,
  toggle,
  create,
  creating,
}: {
  result: GradeResult;
  selected: Set<string>;
  toggle: (hanzi: string) => void;
  create: () => void;
  creating: boolean;
}) {
  const total = result.totalChineseTokens || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  const targetWords = dedupe(result.graded.filter((g) => g.verdict === "TARGET"));
  const beyondWords = dedupe(result.graded.filter((g) => g.verdict === "BEYOND_HSK"));
  const tooHardWords = dedupe(result.graded.filter((g) => g.verdict === "TOO_HARD"));

  const fit = fitVerdict(pct(result.counts.TARGET), pct(result.counts.TOO_HARD));

  return (
    <div className="mt-10 space-y-8">
      <section>
        <h2 className="text-lg font-medium">Breakdown</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Known" v="KNOWN" pct={pct(result.counts.KNOWN)} count={result.counts.KNOWN} />
          <Stat label="Target" v="TARGET" pct={pct(result.counts.TARGET)} count={result.counts.TARGET} />
          <Stat label="Too hard" v="TOO_HARD" pct={pct(result.counts.TOO_HARD)} count={result.counts.TOO_HARD} />
          <Stat label="Beyond HSK" v="BEYOND_HSK" pct={pct(result.counts.BEYOND_HSK)} count={result.counts.BEYOND_HSK} />
        </div>
        <p className={`mt-3 text-sm ${fit.className}`}>{fit.message}</p>
      </section>

      <WordPicker
        title={`Target words — check to add (${targetWords.length} unique)`}
        subtitle="These are at exactly your +1 level. Default selected."
        words={targetWords}
        selected={selected}
        toggle={toggle}
      />

      {beyondWords.length > 0 && (
        <WordPicker
          title={`Beyond HSK 1–6 (${beyondWords.length} unique)`}
          subtitle="Words not in the HSK 1–6 list. Business terms, names, newer vocabulary, or compounds. Pick any you want to learn."
          words={beyondWords}
          selected={selected}
          toggle={toggle}
          defaultUnchecked
        />
      )}

      {tooHardWords.length > 0 && (
        <WordPicker
          title={`Too hard (${tooHardWords.length} unique)`}
          subtitle="More than +1 above your level. Usually skip, but you can still add them."
          words={tooHardWords}
          selected={selected}
          toggle={toggle}
          defaultUnchecked
        />
      )}

      <section className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selected.size} word{selected.size === 1 ? "" : "s"} selected
          </span>
          <button
            onClick={create}
            disabled={creating || selected.size === 0}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? "Creating deck…" : "Create deck"}
          </button>
        </div>
      </section>
    </div>
  );
}

function WordPicker({
  title,
  subtitle,
  words,
  selected,
  toggle,
}: {
  title: string;
  subtitle: string;
  words: GradedWord[];
  selected: Set<string>;
  toggle: (hanzi: string) => void;
  defaultUnchecked?: boolean;
}) {
  if (words.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {words.map((w) => {
          const isOn = selected.has(w.hanzi);
          return (
            <li key={w.hanzi}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition ${
                  isOn
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(w.hanzi)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl">{w.hanzi}</span>
                    <span className="text-xs text-zinc-500">
                      {w.pinyin ?? ""}
                    </span>
                    {w.hskLevel && (
                      <span className="ml-auto text-xs text-zinc-400">
                        HSK {w.hskLevel}
                      </span>
                    )}
                  </div>
                  {w.gloss && (
                    <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {w.gloss}
                    </div>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({
  label,
  v,
  pct,
  count,
}: {
  label: string;
  v: Verdict;
  pct: number;
  count: number;
}) {
  return (
    <div className={`rounded-md p-3 ${verdictStyles[v]}`}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-xl font-semibold">{pct}%</div>
      <div className="text-xs opacity-75">{count} tokens</div>
    </div>
  );
}

function fitVerdict(targetPct: number, tooHardPct: number) {
  if (tooHardPct > 25) {
    return {
      className: "text-rose-700 dark:text-rose-300",
      message: "Too hard for comprehensible input — try an easier source, or raise your HSK level if you already know more than you think.",
    };
  }
  if (targetPct < 5 && tooHardPct < 5) {
    return {
      className: "text-zinc-600 dark:text-zinc-400",
      message: "Not much new here. Good fluency read — but try something harder to grow vocabulary.",
    };
  }
  return {
    className: "text-emerald-700 dark:text-emerald-300",
    message: "Good fit — the target section is where new vocabulary lives.",
  };
}

function dedupe<T extends { hanzi: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (seen.has(w.hanzi)) return false;
    seen.add(w.hanzi);
    return true;
  });
}

