"use server";

import { redirect } from "next/navigation";
import { getVocabPack } from "@/data/vocab-packs";
import { assignToChapter, loadChaptersFromPath } from "@/lib/chapter-import";
import { db } from "@/lib/db";
import { getHskLevel } from "@/lib/hsk";
import { toToneMarks } from "@/lib/pinyin";
import { initialState } from "@/lib/srs";

const DEFAULT_CHUNK_SIZE = 50;
const MIN_CHUNK_SIZE = 10;
const MAX_CHUNK_SIZE = 500;

type Merged = Map<string, { pinyin: string; gloss: string }>;

// Dedupe pack words by hanzi. If the same hanzi appears twice with different
// glosses (cross-chapter, alternate sense), merge with " / ".
function mergePackWords(pack: { words: { hanzi: string; pinyin: string; gloss: string }[] }): Merged {
  const merged: Merged = new Map();
  for (const w of pack.words) {
    const existing = merged.get(w.hanzi);
    if (existing) {
      if (!existing.gloss.includes(w.gloss)) {
        existing.gloss = `${existing.gloss} / ${w.gloss}`;
      }
    } else {
      merged.set(w.hanzi, {
        pinyin: toToneMarks(w.pinyin) ?? w.pinyin,
        gloss: w.gloss,
      });
    }
  }
  return merged;
}

// Import a vocab pack as N word-count chunks. Kept as the fallback when a
// pack has no chapter texts attached.
export async function importVocabPack(
  slug: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): Promise<void> {
  const pack = getVocabPack(slug);
  if (!pack) throw new Error(`unknown pack: ${slug}`);
  if (pack.words.length === 0) throw new Error("pack has no words");

  const size = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, Math.floor(chunkSize)));
  const merged = mergePackWords(pack);
  const entries = Array.from(merged.entries());
  const total = entries.length;
  const chunkCount = Math.max(1, Math.ceil(total / size));

  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const sourceText = entries.map(([hanzi]) => hanzi).join("、");
  const sourceResult = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
    args: [pack.title, sourceText, now],
  });
  const sourceId = Number(sourceResult.rows[0].id);

  for (let i = 0; i < chunkCount; i++) {
    const start = i * size;
    const end = Math.min(start + size, total);
    const slice = entries.slice(start, end);
    const deckName =
      chunkCount === 1
        ? pack.title
        : `${pack.title} · ${start + 1}–${end}`;

    const deckResult = await client.execute({
      sql: `INSERT INTO decks (name, source_id, deck_type, chunk_index, chunk_total, created_at)
            VALUES (?, ?, 'vocab', ?, ?, ?) RETURNING id`,
      args: [deckName, sourceId, i + 1, chunkCount, now],
    });
    const deckId = Number(deckResult.rows[0].id);

    const srs = initialState();
    for (const [hanzi, { pinyin, gloss }] of slice) {
      await client.execute({
        sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                  box, due_at, last_reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        args: [
          deckId,
          hanzi,
          pinyin,
          gloss,
          getHskLevel(hanzi),
          srs.box,
          srs.due_at,
          srs.last_reviewed_at,
          now,
        ],
      });
    }
  }

  redirect(`/sources/${sourceId}`);
}

// Import a vocab pack split by the chapters of the original textbook.
// `chapterIdxs` selects which chapters to import (defaults to all). Words
// that match a selected chapter land in that chapter's deck with an
// example_sentence filled in. Words that don't match ANY selected chapter
// are skipped — pick them up later by importing their chapter.
export async function importVocabPackByChapter(
  slug: string,
  chapterIdxs?: number[],
): Promise<void> {
  const pack = getVocabPack(slug);
  if (!pack) throw new Error(`unknown pack: ${slug}`);
  if (!pack.chapterTextPath) throw new Error(`pack ${slug} has no chapter text`);

  const allChapters = loadChaptersFromPath(pack.chapterTextPath);
  if (allChapters.length === 0) throw new Error("no chapters parsed");

  const wanted =
    chapterIdxs && chapterIdxs.length > 0
      ? new Set(chapterIdxs)
      : new Set(allChapters.map((c) => c.idx));
  const chapters = allChapters.filter((c) => wanted.has(c.idx));
  if (chapters.length === 0) throw new Error("no chapters selected");

  const merged = mergePackWords(pack);
  const packTitle = pack.title;
  const client = db();
  const now = Math.floor(Date.now() / 1000);

  // Build the source row from the words that actually land in selected
  // chapters — keeps the source's "text" field meaningful.
  const targetedWords: [string, { pinyin: string; gloss: string; sentence: string | null; chapterIdx: number }][] = [];
  for (const [hanzi, info] of merged) {
    const a = assignToChapter(chapters, hanzi);
    if (a.chapterIdx === null) continue;
    targetedWords.push([
      hanzi,
      { ...info, sentence: a.sentence, chapterIdx: a.chapterIdx },
    ]);
  }
  if (targetedWords.length === 0) {
    throw new Error("no pack words match the selected chapters");
  }

  const sourceText = targetedWords.map(([h]) => h).join("、");
  const sourceRes = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
    args: [packTitle, sourceText, now],
  });
  const sourceId = Number(sourceRes.rows[0].id);

  const chapterDeckIds = new Map<number, number>();
  for (const c of chapters) {
    const name = `${packTitle} · Ch ${c.idx}: ${c.title}`;
    const ins = await client.execute({
      sql: `INSERT INTO decks (name, source_id, deck_type, chunk_index, chunk_total, created_at)
            VALUES (?, ?, 'vocab', ?, ?, ?) RETURNING id`,
      args: [name, sourceId, c.idx, chapters.length, now],
    });
    chapterDeckIds.set(c.idx, Number(ins.rows[0].id));
  }

  const srs = initialState();
  for (const [hanzi, info] of targetedWords) {
    const deckId = chapterDeckIds.get(info.chapterIdx)!;
    await client.execute({
      sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                box, due_at, last_reviewed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        deckId,
        hanzi,
        info.pinyin,
        info.gloss,
        getHskLevel(hanzi),
        info.sentence,
        srs.box,
        srs.due_at,
        srs.last_reviewed_at,
        now,
      ],
    });
  }

  // If a single chapter was imported, jump straight into that deck.
  if (chapters.length === 1) {
    const onlyDeck = chapterDeckIds.get(chapters[0].idx)!;
    redirect(`/decks/${onlyDeck}`);
  }
  redirect(`/sources/${sourceId}`);
}

// Build a single deck containing only the user-selected subset of pack
// words. Useful when the learner wants a custom mix instead of full
// chapters or fixed-size chunks.
export async function importVocabPackCustom(
  slug: string,
  hanziList: string[],
  deckName: string,
): Promise<void> {
  const pack = getVocabPack(slug);
  if (!pack) throw new Error(`unknown pack: ${slug}`);
  const cleanName = deckName.trim();
  if (!cleanName) throw new Error("deck name required");
  if (hanziList.length === 0) throw new Error("select at least one word");

  const merged = mergePackWords(pack);
  const selected = hanziList
    .map((h) => [h, merged.get(h)] as const)
    .filter((pair): pair is readonly [string, { pinyin: string; gloss: string }] => pair[1] !== undefined);
  if (selected.length === 0) throw new Error("no valid words in selection");

  const client = db();
  const now = Math.floor(Date.now() / 1000);
  const sourceText = selected.map(([h]) => h).join("、");
  const srcRes = await client.execute({
    sql: "INSERT INTO sources (title, kind, text, created_at) VALUES (?, 'other', ?, ?) RETURNING id",
    args: [`${pack.title} (custom)`, sourceText, now],
  });
  const sourceId = Number(srcRes.rows[0].id);

  const deckRes = await client.execute({
    sql: `INSERT INTO decks (name, source_id, deck_type, created_at)
          VALUES (?, ?, 'vocab', ?) RETURNING id`,
    args: [cleanName, sourceId, now],
  });
  const deckId = Number(deckRes.rows[0].id);

  const srs = initialState();
  for (const [hanzi, { pinyin, gloss }] of selected) {
    await client.execute({
      sql: `INSERT INTO cards (deck_id, hanzi, pinyin, gloss, hsk_level, example_sentence,
                                box, due_at, last_reviewed_at, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      args: [
        deckId,
        hanzi,
        pinyin,
        gloss,
        getHskLevel(hanzi),
        srs.box,
        srs.due_at,
        srs.last_reviewed_at,
        now,
      ],
    });
  }

  redirect(`/decks/${deckId}`);
}

// Server-side peek: chapter list with per-chapter match counts so the
// pack page can render a per-chapter picker.
export type ChapterPreview = {
  idx: number;
  title: string;
  wordCount: number;
};

export type ChapterStats = {
  available: boolean;
  chapters: ChapterPreview[];
  matchedCount: number;
  unmatchedCount: number;
  totalWords: number;
};

export async function getChapterStats(slug: string): Promise<ChapterStats> {
  const pack = getVocabPack(slug);
  if (!pack || !pack.chapterTextPath) {
    return {
      available: false,
      chapters: [],
      matchedCount: 0,
      unmatchedCount: 0,
      totalWords: pack?.words.length ?? 0,
    };
  }
  const chapters = loadChaptersFromPath(pack.chapterTextPath);
  const merged = mergePackWords(pack);
  const counts = new Map<number, number>();
  let matched = 0;
  for (const hanzi of merged.keys()) {
    const a = assignToChapter(chapters, hanzi);
    if (a.chapterIdx !== null) {
      matched++;
      counts.set(a.chapterIdx, (counts.get(a.chapterIdx) ?? 0) + 1);
    }
  }
  return {
    available: chapters.length > 0,
    chapters: chapters.map((c) => ({
      idx: c.idx,
      title: c.title,
      wordCount: counts.get(c.idx) ?? 0,
    })),
    matchedCount: matched,
    unmatchedCount: merged.size - matched,
    totalWords: merged.size,
  };
}
