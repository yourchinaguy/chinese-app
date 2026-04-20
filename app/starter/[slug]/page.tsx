import Link from "next/link";
import { notFound } from "next/navigation";
import { getStarterArticle } from "@/data/starter";
import { StarterDetail } from "./StarterDetail";

export default async function StarterArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getStarterArticle(slug);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/starter"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← starter content
        </Link>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {article.title}
        </h1>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          HSK {article.suggestedHsk}
        </span>
      </div>
      <div className="mt-1 text-sm text-zinc-500">{article.titleEn}</div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {article.summary}
      </p>

      <StarterDetail article={article} />
    </main>
  );
}
