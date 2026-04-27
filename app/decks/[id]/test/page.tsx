import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { grammarPointById } from "@/data/grammar-points";
import { cleanTranslations, getHskEntry } from "@/lib/hsk";
import { TestRunner, type TestCard } from "./TestRunner";

export const dynamic = "force-dynamic";

async function loadDeckCards(id: number) {
  const client = db();
  const deckRes = await client.execute({
    sql: "SELECT id, name, deck_type FROM decks WHERE id = ?",
    args: [id],
  });
  if (deckRes.rows.length === 0) return null;
  const row = deckRes.rows[0];
  const deckType =
    String(row.deck_type ?? "vocab") === "grammar" ? "grammar" : "vocab";
  const deck = {
    id: Number(row.id),
    name: String(row.name),
    deckType: deckType as "vocab" | "grammar",
  };

  const cardsRes = await client.execute({
    sql: `SELECT id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                 grammar_point_id, matched_text
          FROM cards WHERE deck_id = ?
          ORDER BY id ASC`,
    args: [id],
  });

  const cards: TestCard[] = cardsRes.rows.map((r) => {
    const hanzi = String(r.hanzi);
    if (deckType === "grammar") {
      const pointId = String(r.grammar_point_id ?? hanzi ?? "");
      const point = grammarPointById(pointId);
      return {
        id: Number(r.id),
        kind: "grammar",
        hanzi,
        pinyin: null,
        glosses: [],
        gloss: point?.name ?? null,
        example_sentence:
          r.example_sentence === null ? null : String(r.example_sentence),
        matched_text: r.matched_text === null ? null : String(r.matched_text),
        pattern: point?.patternZh ?? null,
        description: point?.description ?? null,
      };
    }
    const glosses = cleanTranslations(getHskEntry(hanzi));
    return {
      id: Number(r.id),
      kind: "vocab",
      hanzi,
      pinyin: r.pinyin === null ? null : String(r.pinyin),
      glosses,
      gloss: r.gloss === null ? null : String(r.gloss),
      example_sentence:
        r.example_sentence === null ? null : String(r.example_sentence),
      matched_text: null,
      pattern: null,
      description: null,
    };
  });

  return { deck, cards };
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadDeckCards(Number(id));
  if (!data) notFound();

  const { deck, cards } = data;

  if (cards.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-6">
          <Link
            href={`/decks/${deck.id}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← {deck.name}
          </Link>
        </div>
        <p className="mt-10 text-center text-zinc-500">
          No cards in this deck to test.
        </p>
      </main>
    );
  }

  return <TestRunner deck={deck} cards={cards} />;
}
