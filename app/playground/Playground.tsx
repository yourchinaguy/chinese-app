"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { gradePastedText } from "./actions";
import type { GradeResult, GradedWord, Verdict } from "@/lib/grade";
import type { HskLevel } from "@/lib/hsk";

const SAMPLE_TEXT =
  "今天我们开会讨论新产品的市场推广策略。销售团队需要准备详细的数据分析报告，明天提交给管理层审批。";

const verdictStyles: Record<Verdict, string> = {
  KNOWN: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  TARGET: "bg-amber-200 text-amber-950 font-medium dark:bg-amber-500/40 dark:text-amber-100",
  TOO_HARD: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  BEYOND_HSK: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

const verdictLabels: Record<Verdict, string> = {
  KNOWN: "known",
  TARGET: "target (study this)",
  TOO_HARD: "too hard",
  BEYOND_HSK: "beyond HSK",
};

export function Playground() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [level, setLevel] = useState<HskLevel>(4);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pending, startTransition] = useTransition();

  function analyze() {
    startTransition(async () => {
      const r = await gradePastedText(text, level);
      setResult(r);
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
          ← home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Paste Chinese text. The app segments it, and grades each word against your target HSK level.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Your HSK level: {level}</span>
          <input
            type="range"
            min={1}
            max={6}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as HskLevel)}
            className="mt-1 w-full"
          />
          <span className="text-xs text-zinc-500">
            Words at or below this level are treated as &ldquo;known&rdquo;. Words at level + 1 are &ldquo;target&rdquo;.
          </span>
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-zinc-300 bg-white p-3 font-[system-ui] text-lg leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Paste Chinese text here…"
        />

        <button
          onClick={analyze}
          disabled={pending || !text.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {result && <Results result={result} />}
    </main>
  );
}

function Results({ result }: { result: GradeResult }) {
  const total = result.totalChineseTokens || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  const targetWords = dedupeByHanzi(
    result.graded.filter((g) => g.verdict === "TARGET"),
  );
  const tooHardWords = dedupeByHanzi(
    result.graded.filter((g) => g.verdict === "TOO_HARD"),
  );

  return (
    <div className="mt-10 space-y-8">
      <section>
        <h2 className="text-lg font-medium">Breakdown</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Known" v="KNOWN" pct={pct(result.counts.KNOWN)} count={result.counts.KNOWN} />
          <Stat label="Target" v="TARGET" pct={pct(result.counts.TARGET)} count={result.counts.TARGET} />
          <Stat label="Too hard" v="TOO_HARD" pct={pct(result.counts.TOO_HARD)} count={result.counts.TOO_HARD} />
          <Stat
            label="Beyond HSK"
            v="BEYOND_HSK"
            pct={pct(result.counts.BEYOND_HSK)}
            count={result.counts.BEYOND_HSK}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {result.totalChineseTokens} Chinese word tokens · {result.uniqueChineseWords} unique
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium">Text</h2>
        <p className="mt-2 leading-[2.2] text-lg">
          {result.tokens.map((t, i) => {
            if (!t.isChinese) {
              return (
                <span key={i} className="text-zinc-500">
                  {t.word}
                </span>
              );
            }
            const g = result.graded.find((x) => x.token === t);
            if (!g) return <span key={i}>{t.word}</span>;
            return (
              <span
                key={i}
                title={
                  g.pinyin
                    ? `${g.pinyin} — ${g.gloss ?? ""}${g.hskLevel ? ` (HSK ${g.hskLevel})` : ""}`
                    : "not in HSK 1–6"
                }
                className={`rounded px-0.5 ${verdictStyles[g.verdict]}`}
              >
                {t.word}
              </span>
            );
          })}
        </p>
      </section>

      {targetWords.length > 0 && (
        <WordTable title={`Target words (${targetWords.length})`} words={targetWords} />
      )}
      {tooHardWords.length > 0 && (
        <WordTable title={`Too hard (${tooHardWords.length})`} words={tooHardWords} />
      )}
    </div>
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

function WordTable({ title, words }: { title: string; words: GradedWord[] }) {
  return (
    <section>
      <h2 className="text-lg font-medium">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead className="text-left text-xs uppercase text-zinc-500">
          <tr>
            <th className="py-2 pr-4">Hanzi</th>
            <th className="py-2 pr-4">Pinyin</th>
            <th className="py-2 pr-4">Meaning</th>
            <th className="py-2 pr-4">HSK</th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <tr
              key={w.hanzi}
              className="border-t border-zinc-200 dark:border-zinc-800"
            >
              <td className="py-2 pr-4 text-lg">{w.hanzi}</td>
              <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                {w.pinyin ?? "—"}
              </td>
              <td className="py-2 pr-4">{w.gloss ?? "—"}</td>
              <td className="py-2 pr-4 text-zinc-500">{w.hskLevel ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function dedupeByHanzi<T extends { hanzi: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (seen.has(w.hanzi)) return false;
    seen.add(w.hanzi);
    return true;
  });
}
