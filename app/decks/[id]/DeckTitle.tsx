"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { renameDeck } from "../actions";

// Split a deck name into [main, sub]. For chapter-imported decks the stored
// name is "<source title> · Ch N: <chapter title>" — we surface the chapter
// part as the headline and the source as a small subtitle so the page header
// doesn't wrap to three lines.
function splitDeckName(name: string): { main: string; sub: string | null } {
  const m = name.match(/^(.+?)\s*·\s*(Ch\s*\d+.*)$/i);
  if (m) return { main: m[2].trim(), sub: m[1].trim() };
  return { main: name, sub: null };
}

// Click-to-edit deck title. Pencil icon next to the h1; click → input
// replaces the heading; Enter saves, Esc cancels. Server action revalidates
// /decks and /decks/[id] so the new name appears everywhere on next render.
export function DeckTitle({
  deckId,
  name,
  sourceId,
}: {
  deckId: number;
  name: string;
  sourceId?: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function open() {
    setDraft(name);
    setErr(null);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setErr(null);
  }
  function save() {
    const v = draft.trim();
    if (!v) {
      setErr("Name can't be empty.");
      return;
    }
    if (v === name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await renameDeck(deckId, v);
        setEditing(false);
      } catch (e) {
        setErr(String((e as Error)?.message ?? e));
      }
    });
  }

  if (!editing) {
    const { main, sub } = splitDeckName(name);
    return (
      <div className="min-w-0 flex-1">
        {sub && (
          <div className="truncate text-xs text-zinc-500">
            {sourceId ? (
              <Link
                href={`/sources/${sourceId}`}
                className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-200"
              >
                {sub}
              </Link>
            ) : (
              sub
            )}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">{main}</h1>
          <button
            onClick={open}
            aria-label="Rename deck"
            title="Rename"
            className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            rename
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-2xl font-semibold disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1 dark:border-zinc-700"
        >
          Cancel
        </button>
        {err && <span className="text-rose-700 dark:text-rose-300">{err}</span>}
      </div>
    </div>
  );
}
