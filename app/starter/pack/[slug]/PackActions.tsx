"use client";

import { useTransition } from "react";
import { importVocabPack } from "./actions";

export function PackActions({
  slug,
  count,
}: {
  slug: string;
  count: number;
}) {
  const [pending, startTransition] = useTransition();

  function importAll() {
    startTransition(async () => {
      await importVocabPack(slug);
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">Import as vocab deck</div>
          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
            Creates one card per word ({count} total). HSK levels filled in
            automatically where the word is on the HSK 1–6 list. No grammar
            deck — this pack is pure vocabulary.
          </p>
        </div>
        <button
          onClick={importAll}
          disabled={pending}
          className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Importing…" : `Import → ${count}`}
        </button>
      </div>
    </div>
  );
}
