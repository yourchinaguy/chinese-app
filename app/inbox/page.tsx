import Link from "next/link";

export default function InboxGuidePage() {
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

      <h1 className="text-2xl font-semibold tracking-tight">
        Turn photos into study decks
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        The app doesn&rsquo;t yet have a built-in camera. Instead, drop photos
        into your local repo and Claude Code reads them multimodally, extracts
        the Chinese, <strong>and auto-imports them as decks</strong>. Zero API
        cost — Claude Code&rsquo;s vision handles the OCR and a local script
        writes the decks directly to your database.
      </p>

      <ol className="mt-8 space-y-6">
        <Step
          n={1}
          title="Make a folder for the source"
          body={
            <>
              In the repo, create{" "}
              <Code>inbox/&lt;name&gt;/</Code> — one folder per article,
              magazine page, or sign. Name it something memorable, e.g.{" "}
              <Code>inbox/36kr-dji-interview/</Code>.
            </>
          }
        />

        <Step
          n={2}
          title="Drop the photos inside"
          body={
            <>
              Phone shots, screenshots, scans — all fine. For multi-page
              articles, name them so they sort in reading order:{" "}
              <Code>page-01.jpg</Code>, <Code>page-02.jpg</Code>, …
              <div className="mt-2 text-xs text-zinc-500">
                Everything under <Code>inbox/&lt;name&gt;/</Code> is
                gitignored — your photos never leave your laptop.
              </div>
            </>
          }
        />

        <Step
          n={3}
          title="Ask Claude Code to process"
          body={
            <>
              Open the repo in Claude Code and say:
              <Prompt>Process inbox/36kr-dji-interview</Prompt>
              Claude Code reads each image in filename order, extracts the
              Chinese into <Code>extracted.md</Code>, and runs{" "}
              <Code>npm run import-text</Code> automatically — creating vocab
              and grammar decks. You don&rsquo;t paste anything.
            </>
          }
        />

        <Step
          n={4}
          title="Open /decks and review"
          body={
            <>
              The new deck is waiting in{" "}
              <Link href="/decks" className="underline">
                /decks
              </Link>
              . If a piece turned out above your level, you can always route
              it through the{" "}
              <Link href="/starter" className="underline">
                simplify loop
              </Link>{" "}
              afterwards.
            </>
          }
        />
      </ol>

      <section className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="font-medium">Good to know</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            You&rsquo;ll need <strong>Claude Code</strong> (or a similar
            local agent that can read images and run shell commands) set up
            on your machine. The repo will go open-source once the app is
            validated, so anyone with a local AI agent can fork and run
            this flow.
          </li>
          <li>
            Auto-import uses sensible defaults (all target words, proper
            nouns, and detected grammar). If you want to curate picks
            yourself, run <Code>npm run import-text</Code> manually on an
            existing <Code>extracted.md</Code>, or open{" "}
            <Link href="/import" className="underline">
              /import
            </Link>{" "}
            and paste the text — both routes end up at the same place.
          </li>
          <li>
            Handwriting is hit-or-miss. Printed text works great.
          </li>
        </ul>
      </section>
    </main>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {body}
        </div>
      </div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-200 px-1 font-mono text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
      {children}
    </code>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
      {children}
    </div>
  );
}
