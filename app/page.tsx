import Link from "next/link";
import { db } from "@/lib/db";
import { listStudyingDecks, type StudyingDeckSummary } from "@/lib/deck-status";

export const dynamic = "force-dynamic";

const links = [
  {
    href: "/decks",
    title: "Decks",
    subtitle: "Review your flashcards.",
  },
  {
    href: "/import",
    title: "Import",
    subtitle: "Paste a blog post, lesson, or podcast transcript → turns into a deck.",
  },
  {
    href: "/starter",
    title: "Starter content",
    subtitle: "Curated articles to bootstrap your decks — or adapt one to your level first via Claude.",
  },
  {
    href: "/inbox",
    title: "Turn photos into decks",
    subtitle: "Drop page photos in a folder, ask Claude Code to extract the Chinese, paste into Import.",
  },
  {
    href: "/retest",
    title: "Retest",
    subtitle: "Quick 20-word checks per HSK level / textbook / recently studied. Misses build a study deck automatically.",
  },
  {
    href: "/calibrate",
    title: "Calibrate",
    subtitle: "Retake the known-word quiz to update your baseline.",
  },
];

function shortName(name: string): string {
  const seps = ["：", "（", "(", " — ", " - "];
  let cut = name.length;
  for (const s of seps) {
    const i = name.indexOf(s);
    if (i > 0 && i < cut) cut = i;
  }
  return name.slice(0, cut).trim();
}

function formatRelative(unix: number | null): string {
  if (unix === null) return "—";
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function StudyingRow({ deck }: { deck: StudyingDeckSummary }) {
  const masteredPct = deck.total > 0 ? Math.round((deck.mastered / deck.total) * 100) : 0;
  return (
    <Link
      href={`/decks/${deck.deckId}`}
      className="block rounded-lg border border-zinc-200 px-5 py-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{shortName(deck.name)}</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {deck.mastered}/{deck.total} mastered ({masteredPct}%)
            {" · "}
            {deck.dueNow > 0
              ? `${deck.dueNow} due now`
              : `last studied ${formatRelative(deck.lastReviewedAt)}`}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            deck.dueNow > 0
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          }`}
        >
          {deck.dueNow > 0 ? "Resume →" : "Open →"}
        </span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${masteredPct}%` }}
        />
      </div>
    </Link>
  );
}

export default async function Home() {
  const studying = await listStudyingDecks(db(), 5);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">中文 · Chinese learning app</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Paste real content, filter to the ~20% just above your level, turn it into flashcards.
      </p>

      {studying.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Continue studying
          </h2>
          <ul className="mt-3 space-y-2">
            {studying.map((d) => (
              <li key={d.deckId}>
                <StudyingRow deck={d} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="mt-10 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-lg border border-zinc-200 px-5 py-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="text-lg font-medium">{l.title}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{l.subtitle}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
