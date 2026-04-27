"use client";

import { useTransition } from "react";
import { renameDeck } from "./actions";

export function RowRenameButton({
  deckId,
  deckName,
}: {
  deckId: number;
  deckName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const next = window.prompt(`Rename deck`, deckName);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === deckName) return;
    startTransition(async () => {
      await renameDeck(deckId, trimmed);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={`Rename "${deckName}"`}
      aria-label={`Rename "${deckName}"`}
      className="shrink-0 rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      {pending ? "…" : "✎"}
    </button>
  );
}
