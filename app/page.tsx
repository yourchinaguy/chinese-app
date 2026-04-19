import Link from "next/link";

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
    href: "/calibrate",
    title: "Calibrate",
    subtitle: "Retake the known-word quiz to update your baseline.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">中文 · Chinese learning app</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Paste real content, filter to the ~20% just above your level, turn it into flashcards.
      </p>
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
