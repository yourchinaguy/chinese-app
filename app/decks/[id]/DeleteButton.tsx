"use client";

import { useTransition } from "react";
import { deleteDeck } from "./actions";

export function DeleteButton({
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
      className="text-xs text-rose-700 underline hover:text-rose-900 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-100"
    >
      {pending ? "Deleting…" : "Delete deck"}
    </button>
  );
}
