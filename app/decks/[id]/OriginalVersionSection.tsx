"use client";

import { useState } from "react";
import Link from "next/link";

// Shown on the caught-up state of decks whose source has an `original_text`
// (i.e. the deck was created from a Claude.ai-simplified version of a harder
// piece). Invites the learner to level up to the original when they've had
// the simplified deck for long enough — 14+ days by default.

export function OriginalVersionSection({
  title,
  originalText,
  ageDays,
  ready,
}: {
  title: string;
  originalText: string;
  ageDays: number;
  ready: boolean;
}) {
  const [open, setOpen] = useState(ready);
  const importHref =
    "/import?" +
    new URLSearchParams({
      title: `${title.replace(/（HSK\s*\d+\s*改写）\s*$/u, "").trim()}（原版）`,
      text: originalText,
      kind: "article",
    }).toString();

  return (
    <section
      className={`mt-8 rounded-lg border p-4 ${
        ready
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-base font-medium">
            {ready ? "Ready for the original?" : "Original version available"}
          </div>
          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
            {ready
              ? `You've been studying this deck for ${ageDays} days. Give the original, un-simplified text a try — you probably know more than you think.`
              : "You imported a simplified version of this. The original is here when you're ready."}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          {open ? "hide" : "show"}
        </button>
      </div>

      {open && (
        <>
          <blockquote className="mt-4 whitespace-pre-wrap rounded-md border-l-2 border-zinc-400 bg-white p-3 text-base leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
            {originalText}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={importHref}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Import original as new deck →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
