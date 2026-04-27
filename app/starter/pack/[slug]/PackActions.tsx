"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  importVocabPack,
  importVocabPackByChapter,
  type ChapterStats,
} from "./actions";

const PRESETS = [25, 50, 100];
const DEFAULT = 50;

export function PackActions({
  slug,
  count,
  chapterStats,
}: {
  slug: string;
  count: number;
  chapterStats: ChapterStats;
}) {
  const hasChapters = chapterStats.available;

  return (
    <div className="mt-6 space-y-4">
      {hasChapters ? (
        <ChapterImportCard slug={slug} stats={chapterStats} />
      ) : null}

      <ChunkImportCard slug={slug} count={count} primary={!hasChapters} />

      <CustomDeckLink slug={slug} />
    </div>
  );
}

function ChapterImportCard({
  slug,
  stats,
}: {
  slug: string;
  stats: ChapterStats;
}) {
  const [pending, startTransition] = useTransition();
  // Default: all chapters selected.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(stats.chapters.map((c) => c.idx)),
  );

  const allOn = stats.chapters.every((c) => selected.has(c.idx));
  const noneOn = selected.size === 0;
  const wordsInSelection = stats.chapters
    .filter((c) => selected.has(c.idx))
    .reduce((sum, c) => sum + c.wordCount, 0);

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(stats.chapters.map((c) => c.idx)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  function importSelected() {
    if (noneOn) return;
    const idxs = Array.from(selected).sort((a, b) => a - b);
    startTransition(async () => {
      await importVocabPackByChapter(slug, idxs);
    });
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/10">
      <div className="font-medium">Import by chapter</div>
      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
        One deck per textbook chapter. Each card gets an example sentence
        pulled from that chapter&rsquo;s text.
      </p>
      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        {stats.chapters.length} chapter
        {stats.chapters.length === 1 ? "" : "s"} available · {stats.matchedCount}/
        {stats.totalWords} words matched
        {stats.unmatchedCount > 0 && (
          <span className="text-zinc-500">
            {" "}
            ({stats.unmatchedCount} unmatched — pick them up later as more
            chapters are added)
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          disabled={allOn}
          className="rounded-md border border-zinc-300 px-2.5 py-1 hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
        >
          All
        </button>
        <button
          type="button"
          onClick={selectNone}
          disabled={noneOn}
          className="rounded-md border border-zinc-300 px-2.5 py-1 hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
        >
          None
        </button>
        <span className="text-zinc-500">
          {selected.size} of {stats.chapters.length} chapters · {wordsInSelection} words
        </span>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {stats.chapters.map((c) => {
          const isOn = selected.has(c.idx);
          return (
            <li key={c.idx}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                  isOn
                    ? "border-emerald-600 bg-white dark:bg-emerald-900/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(c.idx)}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Ch {c.idx}:</span>{" "}
                  <span className="truncate">{c.title}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {c.wordCount} words
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        onClick={importSelected}
        disabled={pending || noneOn}
        className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending
          ? "Importing…"
          : noneOn
            ? "Pick a chapter to continue"
            : selected.size === 1
              ? `Import 1 chapter → ${wordsInSelection} words`
              : `Import ${selected.size} chapters → ${wordsInSelection} words`}
      </button>
    </div>
  );
}

function ChunkImportCard({
  slug,
  count,
  primary,
}: {
  slug: string;
  count: number;
  primary: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [chunkSize, setChunkSize] = useState<number>(DEFAULT);

  const effectiveSize = Math.max(10, Math.min(500, chunkSize || DEFAULT));
  const chunkCount = Math.max(1, Math.ceil(count / effectiveSize));

  function importPack() {
    startTransition(async () => {
      await importVocabPack(slug, effectiveSize);
    });
  }

  const containerClass = primary
    ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/10"
    : "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
  const buttonClass = primary
    ? "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
    : "rounded-md border border-zinc-400 px-4 py-2 text-sm font-medium hover:border-zinc-700 disabled:opacity-50 dark:border-zinc-600 dark:hover:border-zinc-400";

  return (
    <div className={containerClass}>
      <div className="font-medium">
        {primary ? "Import as vocab decks" : "Or split by N words per deck"}
      </div>
      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
        Splits the pack into evenly-sized chunks. Useful when the textbook has
        no chapter texts attached, or when you just want fixed-size batches.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">
          Words per deck:
        </label>
        <div className="flex items-center gap-1">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setChunkSize(n)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                chunkSize === n
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
              }`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={10}
            max={500}
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            className="ml-2 w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Custom chunk size"
          />
        </div>
        <span className="text-xs text-zinc-500">
          → {chunkCount} deck{chunkCount === 1 ? "" : "s"}
        </span>
      </div>

      <button onClick={importPack} disabled={pending} className={`mt-4 ${buttonClass}`}>
        {pending
          ? "Importing…"
          : `Import ${count} words → ${chunkCount} deck${chunkCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function CustomDeckLink({ slug }: { slug: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <div className="font-medium">Build a custom deck</div>
      <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
        Pick exactly the words you want and create a single named deck.
      </p>
      <Link
        href={`/starter/pack/${slug}/custom`}
        className="mt-3 inline-block rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-zinc-500 dark:border-zinc-700"
      >
        Open word picker →
      </Link>
    </div>
  );
}
