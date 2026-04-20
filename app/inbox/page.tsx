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
        the Chinese, and hands back clean text you paste into Import. Zero API
        cost — your Claude Code session handles the OCR directly.
      </p>

      <ol className="mt-8 space-y-6">
        <Step
          n={1}
          title="Make a folder for the source"
          body={
            <>
              In the repo, create{" "}
              <Code>inbox/&lt;name&gt;/</Code> — one folder per article,
              magazine page, or sign you want to study. Name it something
              memorable, e.g.{" "}
              <Code>inbox/36kr-dji-interview/</Code> or{" "}
              <Code>inbox/beijing-subway-sign/</Code>.
            </>
          }
        />

        <Step
          n={2}
          title="Drop the photos inside"
          body={
            <>
              Phone shots, screenshots, scans — all fine. If an article spans
              multiple pages, name them so they sort in reading order:{" "}
              <Code>page-01.jpg</Code>, <Code>page-02.jpg</Code>, …
              <div className="mt-2 text-xs text-zinc-500">
                Only photos you have the right to study from. Everything under{" "}
                <Code>inbox/&lt;name&gt;/</Code> is gitignored by default — your
                photos never leave your laptop.
              </div>
            </>
          }
        />

        <Step
          n={3}
          title="Ask Claude Code to process them"
          body={
            <>
              Open the repo in Claude Code and say something like:
              <Prompt>Process inbox/36kr-dji-interview</Prompt>
              Claude Code reads each image in filename order, extracts the
              Chinese, and writes the concatenated text to{" "}
              <Code>inbox/&lt;name&gt;/extracted.md</Code>. Anything unreadable
              is flagged so you can re-shoot.
            </>
          }
        />

        <Step
          n={4}
          title="Import into the app"
          body={
            <>
              Open <Code>extracted.md</Code>, copy the Chinese, head to{" "}
              <Link href="/import" className="underline">
                /import
              </Link>
              , paste. Optionally use the{" "}
              <Link href="/starter" className="underline">
                simplify loop on /starter
              </Link>{" "}
              first if it&rsquo;s above your level.
            </>
          }
        />
      </ol>

      <section className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="font-medium">Honest limitations</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            Requires <strong>Claude Code</strong> installed locally (you already
            have it; a friend sharing your app later would too).
          </li>
          <li>
            It&rsquo;s manual — you ask, Claude Code processes. V2 will have
            proper in-app upload + OCR via an API, so anyone can use it without
            running Claude Code.
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
