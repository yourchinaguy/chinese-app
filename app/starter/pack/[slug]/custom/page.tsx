import Link from "next/link";
import { notFound } from "next/navigation";
import { getVocabPack } from "@/data/vocab-packs";
import { getHskLevel } from "@/lib/hsk";
import { CustomDeckBuilder, type PackWord } from "./CustomDeckBuilder";

export default async function CustomDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getVocabPack(slug);
  if (!pack) notFound();

  // Dedupe by hanzi up front so the picker shows one row per word.
  const seen = new Set<string>();
  const words: PackWord[] = [];
  for (const w of pack.words) {
    if (seen.has(w.hanzi)) continue;
    seen.add(w.hanzi);
    words.push({
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      gloss: w.gloss,
      hskLevel: getHskLevel(w.hanzi),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/starter/pack/${slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← {pack.title}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Build a custom deck</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Pick the words you want, give the deck a name, and create it.
      </p>

      <CustomDeckBuilder slug={slug} words={words} packTitle={pack.title} />
    </main>
  );
}
