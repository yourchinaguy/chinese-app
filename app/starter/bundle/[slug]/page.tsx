import Link from "next/link";
import { notFound } from "next/navigation";
import { getStarterBundle, getBundleArticles } from "@/data/starter";
import { BundleActions } from "./BundleActions";

export default async function BundlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = getStarterBundle(slug);
  if (!bundle) notFound();
  const articles = getBundleArticles(bundle);

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {bundle.name}
          </h1>
          {bundle.nameZh && (
            <div className="mt-0.5 text-sm text-zinc-500">{bundle.nameZh}</div>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {articles.length} articles
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {bundle.description}
      </p>

      <BundleActions slug={bundle.slug} count={articles.length} />

      <ul className="mt-8 space-y-3">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/starter/${a.slug}`}
              className="block rounded-lg border border-zinc-200 p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-lg font-medium">{a.title}</div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  HSK {a.suggestedHsk}
                </span>
              </div>
              <div className="mt-0.5 text-sm text-zinc-500">{a.titleEn}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {a.summary}
              </p>
              {(a.source || a.date) && (
                <div className="mt-2 text-xs text-zinc-500">
                  {a.source?.name}
                  {a.source && a.date && " · "}
                  {a.date}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
