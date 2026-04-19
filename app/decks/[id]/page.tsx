import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

type Deck = { id: number; name: string };
export type Card = {
  id: number;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  hsk_level: number | null;
  example_sentence: string | null;
  box: number;
  due_at: number;
};

async function loadDeck(id: number): Promise<{ deck: Deck; due: Card[]; total: number } | null> {
  const client = db();
  const deckRes = await client.execute({
    sql: "SELECT id, name FROM decks WHERE id = ?",
    args: [id],
  });
  if (deckRes.rows.length === 0) return null;
  const deck: Deck = {
    id: Number(deckRes.rows[0].id),
    name: String(deckRes.rows[0].name),
  };

  const now = Math.floor(Date.now() / 1000);
  const dueRes = await client.execute({
    sql: `SELECT id, hanzi, pinyin, gloss, hsk_level, example_sentence, box, due_at
          FROM cards
          WHERE deck_id = ? AND due_at <= ?
          ORDER BY box ASC, due_at ASC`,
    args: [id, now],
  });
  const totalRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM cards WHERE deck_id = ?",
    args: [id],
  });

  const due: Card[] = dueRes.rows.map((row) => ({
    id: Number(row.id),
    hanzi: String(row.hanzi),
    pinyin: row.pinyin === null ? null : String(row.pinyin),
    gloss: row.gloss === null ? null : String(row.gloss),
    hsk_level: row.hsk_level === null ? null : Number(row.hsk_level),
    example_sentence: row.example_sentence === null ? null : String(row.example_sentence),
    box: Number(row.box),
    due_at: Number(row.due_at),
  }));

  return { deck, due, total: Number(totalRes.rows[0].c) };
}

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadDeck(Number(id));
  if (!data) notFound();

  const { deck, due, total } = data;

  if (due.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/decks"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← decks
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-lg">You&rsquo;re caught up.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {total} cards in this deck. Come back later when more are due.
          </p>
        </div>
      </main>
    );
  }

  return <Review deck={deck} cards={due} total={total} />;
}
