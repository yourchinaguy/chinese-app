"use client";

import { useMemo, useState, useTransition } from "react";
import { importVocabPackCustom } from "../actions";

export type PackWord = {
  hanzi: string;
  pinyin: string;
  gloss: string;
  hskLevel: number | null;
};

type HskFilter = "all" | "hsk-only" | "beyond" | number;

export function CustomDeckBuilder({
  slug,
  words,
  packTitle,
}: {
  slug: string;
  words: PackWord[];
  packTitle: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HskFilter>("all");
  const [deckName, setDeckName] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      if (filter === "hsk-only" && w.hskLevel === null) return false;
      if (filter === "beyond" && w.hskLevel !== null) return false;
      if (typeof filter === "number" && w.hskLevel !== filter) return false;
      if (!q) return true;
      return (
        w.hanzi.includes(q) ||
        w.pinyin.toLowerCase().includes(q) ||
        w.gloss.toLowerCase().includes(q)
      );
    });
  }, [words, query, filter]);

  function toggle(hanzi: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hanzi)) next.delete(hanzi);
      else next.add(hanzi);
      return next;
    });
  }
  function selectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const w of visible) next.add(w.hanzi);
      return next;
    });
  }
  function deselectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const w of visible) next.delete(w.hanzi);
      return next;
    });
  }
  function clearAll() {
    setSelected(new Set());
  }

  function create() {
    const finalName = deckName.trim() || `${packTitle} (custom)`;
    startTransition(async () => {
      await importVocabPackCustom(slug, Array.from(selected), finalName);
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hanzi, pinyin, or gloss"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={String(filter)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "all" || v === "hsk-only" || v === "beyond") setFilter(v);
            else setFilter(Number(v));
          }}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All levels</option>
          <option value="hsk-only">HSK 1–6 only</option>
          <option value="beyond">Beyond HSK</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              HSK {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={selectVisible}
          className="rounded-md border border-zinc-300 px-2.5 py-1 hover:border-zinc-500 dark:border-zinc-700"
        >
          Select visible ({visible.length})
        </button>
        <button
          type="button"
          onClick={deselectVisible}
          className="rounded-md border border-zinc-300 px-2.5 py-1 hover:border-zinc-500 dark:border-zinc-700"
        >
          Deselect visible
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-zinc-300 px-2.5 py-1 hover:border-zinc-500 dark:border-zinc-700"
        >
          Clear all
        </button>
        <span className="ml-auto text-zinc-500">
          {selected.size} of {words.length} selected
          {visible.length !== words.length && ` · ${visible.length} shown`}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((w) => {
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base">{w.hanzi}</span>
                    <span className="text-xs text-zinc-500">{w.pinyin}</span>
                    {w.hskLevel && (
                      <span className="ml-auto text-xs text-zinc-400">
                        HSK {w.hskLevel}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {w.gloss}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No words match the current filter.
        </div>
      )}

      <section className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder={`${packTitle} (custom)`}
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Deck name"
          />
          <button
            onClick={create}
            disabled={pending || selected.size === 0}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending
              ? "Creating…"
              : selected.size === 0
                ? "Pick some words to continue"
                : `Create deck → ${selected.size} word${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>
    </div>
  );
}
