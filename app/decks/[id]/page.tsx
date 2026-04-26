import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { grammarPointById, wikiUrlFor } from "@/data/grammar-points";
import { cleanTranslations, getHskEntry } from "@/lib/hsk";
import { DeckTitle } from "./DeckTitle";
import { DeleteButton } from "./DeleteButton";
import { GrammarReview, type GrammarCard } from "./GrammarReview";
import { OriginalVersionSection } from "./OriginalVersionSection";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

const ORIGINAL_PROMPT_AFTER_DAYS = 14;

export type Deck = {
  id: number;
  name: string;
  deckType: "vocab" | "grammar";
};

export type Card = {
  id: number;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  glosses: string[];
  hsk_level: number | null;
  example_sentence: string | null;
  box: number;
  due_at: number;
};

async function loadDeck(id: number) {
  const client = db();
  const deckRes = await client.execute({
    sql: `SELECT d.id, d.name, d.deck_type, d.created_at,
                 s.original_text
          FROM decks d
          LEFT JOIN sources s ON s.id = d.source_id
          WHERE d.id = ?`,
    args: [id],
  });
  if (deckRes.rows.length === 0) return null;
  const deckType =
    String(deckRes.rows[0].deck_type ?? "vocab") === "grammar"
      ? "grammar"
      : "vocab";
  const deck: Deck = {
    id: Number(deckRes.rows[0].id),
    name: String(deckRes.rows[0].name),
    deckType,
  };
  const createdAt = Number(deckRes.rows[0].created_at);
  const originalText =
    deckRes.rows[0].original_text === null
      ? null
      : String(deckRes.rows[0].original_text);
  const ageDays = Math.floor(
    (Math.floor(Date.now() / 1000) - createdAt) / 86400,
  );

  const now = Math.floor(Date.now() / 1000);
  const dueRes = await client.execute({
    sql: `SELECT id, hanzi, pinyin, gloss, hsk_level, example_sentence, box, due_at,
                 grammar_point_id, matched_text
          FROM cards
          WHERE deck_id = ? AND due_at <= ?
          ORDER BY box ASC, due_at ASC`,
    args: [id, now],
  });
  const totalRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM cards WHERE deck_id = ?",
    args: [id],
  });

  if (deckType === "grammar") {
    const due: GrammarCard[] = [];
    for (const row of dueRes.rows) {
      const pointId = String(row.grammar_point_id ?? row.hanzi ?? "");
      const point = grammarPointById(pointId);
      if (!point) continue; // grammar point was deleted from data file
      due.push({
        id: Number(row.id),
        pointId,
        name: point.name,
        patternZh: point.patternZh,
        cefr: point.cefr,
        approxHsk: point.approxHsk,
        description: point.description,
        wikiUrl: wikiUrlFor(point),
        sentence: String(row.example_sentence ?? ""),
        matchedText: String(row.matched_text ?? ""),
        box: Number(row.box),
        due_at: Number(row.due_at),
      });
    }
    return {
      deck,
      due,
      total: Number(totalRes.rows[0].c),
      kind: "grammar" as const,
      originalText,
      ageDays,
    };
  }

  const due: Card[] = dueRes.rows.map((row) => {
    const hanzi = String(row.hanzi);
    const glosses = cleanTranslations(getHskEntry(hanzi));
    return {
      id: Number(row.id),
      hanzi,
      pinyin: row.pinyin === null ? null : String(row.pinyin),
      gloss: row.gloss === null ? null : String(row.gloss),
      glosses,
      hsk_level: row.hsk_level === null ? null : Number(row.hsk_level),
      example_sentence:
        row.example_sentence === null ? null : String(row.example_sentence),
      box: Number(row.box),
      due_at: Number(row.due_at),
    };
  });
  return {
    deck,
    due,
    total: Number(totalRes.rows[0].c),
    kind: "vocab" as const,
    originalText,
    ageDays,
  };
}

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadDeck(Number(id));
  if (!data) notFound();

  const { deck, due, total, originalText, ageDays } = data;
  const ready = ageDays >= ORIGINAL_PROMPT_AFTER_DAYS;

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
        <DeckTitle deckId={deck.id} name={deck.name} />
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-lg">You&rsquo;re caught up.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {total} cards in this deck. Come back later when more are due.
          </p>
        </div>
        {originalText && (
          <OriginalVersionSection
            title={deck.name}
            originalText={originalText}
            ageDays={ageDays}
            ready={ready}
          />
        )}
        <div className="mt-10 text-right">
          <DeleteButton deckId={deck.id} deckName={deck.name} cardCount={total} />
        </div>
      </main>
    );
  }

  if (data.kind === "grammar") {
    return (
      <GrammarReview
        deck={deck}
        cards={data.due}
        total={total}
        originalText={originalText}
        readyForOriginal={ready}
        ageDays={ageDays}
      />
    );
  }
  return (
    <Review
      deck={deck}
      cards={data.due}
      total={total}
      originalText={originalText}
      readyForOriginal={ready}
      ageDays={ageDays}
    />
  );
}
