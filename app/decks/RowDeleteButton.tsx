"use client";

import { useTransition } from "react";
import { deleteDeck } from "./actions";

// Compact ✕ button for the /decks list row. Confirms before delete; lighter
// styling than the in-deck-detail Delete button so it doesn't dominate the
// row.
export function RowDeleteButton({
  deckId,
  deckName,
  cardCount,
}: {
  deckId: number;
  deckName: string;
  cardCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Delete "${deckName}"?\n\nThis removes ${cardCount} card${
        cardCount === 1 ? "" : "s"
      } and the review history. Your known-word baseline and the source text are kept.\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteDeck(deckId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={`Delete "${deckName}"`}
      aria-label={`Delete "${deckName}"`}
      className="shrink-0 rounded-md p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:hover:bg-rose-900/20 dark:hover:text-rose-300"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
