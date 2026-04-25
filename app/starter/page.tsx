import Link from "next/link";
import { starterArticles, starterBundles, getBundleArticles } from "@/data/starter";

export default function StarterPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Starter content</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Curated pieces to bootstrap your decks. Browse a themed bundle below,
        or pick individual articles further down.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Bundles
        </h2>
        <ul className="mt-3 space-y-3">
          {starterBundles.map((b) => {
            const articles = getBundleArticles(b);
            return (
              <li key={b.slug}>
                <Link
                  href={`/starter/bundle/${b.slug}`}
                  className="block rounded-lg border border-zinc-200 p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-lg font-medium">{b.name}</div>
                      {b.nameZh && (
                        <div className="text-sm text-zinc-500">{b.nameZh}</div>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {articles.length} articles
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {b.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Individual articles
        </h2>
        <ul className="mt-3 space-y-3">
          {starterArticles.map((a) => (
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
                <div className="mt-3 flex flex-wrap gap-1 text-xs text-zinc-500">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-zinc-200 px-2 py-0.5 dark:border-zinc-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs text-zinc-500">
        Want to add more? Drop entries into{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">data/starter.ts</code>{" "}
        and commit.
      </p>
    </main>
  );
}
