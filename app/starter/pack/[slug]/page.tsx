import Link from "next/link";
import { notFound } from "next/navigation";
import { getVocabPack } from "@/data/vocab-packs";
import { getHskLevel } from "@/lib/hsk";
import { getChapterStats } from "./actions";
import { PackActions } from "./PackActions";

export default async function PackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getVocabPack(slug);
  if (!pack) notFound();

  const chapterStats = await getChapterStats(slug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/starter"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← starter content
        </Link>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {pack.title}
          </h1>
          <div className="mt-0.5 text-sm text-zinc-500">{pack.titleEn}</div>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {pack.words.length} words
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {pack.description}
      </p>
      {pack.source && (
        <div className="mt-2 text-xs text-zinc-500">
          Source: {pack.source.name}
        </div>
      )}

      <PackActions
        slug={pack.slug}
        count={pack.words.length}
        chapterStats={chapterStats}
      />

      <details className="mt-8" open={pack.words.length <= 50}>
        <summary className="cursor-pointer select-none text-sm font-medium">
          Preview all {pack.words.length} words
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
          {pack.words.map((w, i) => {
            const lvl = getHskLevel(w.hanzi);
            return (
              <li
                key={`${w.hanzi}-${i}`}
                className="flex items-baseline gap-3 text-sm"
              >
                <span className="shrink-0 whitespace-nowrap text-base">
                  {w.hanzi}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="mr-2 whitespace-nowrap text-xs text-zinc-500">
                    {w.pinyin}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {w.gloss}
                  </span>
                </div>
                {lvl && (
                  <span className="shrink-0 whitespace-nowrap text-xs text-zinc-400">
                    HSK {lvl}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </main>
  );
}
