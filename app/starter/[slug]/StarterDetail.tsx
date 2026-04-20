"use client";

import { useState } from "react";
import Link from "next/link";
import type { StarterArticle } from "@/data/starter";

export function StarterDetail({ article }: { article: StarterArticle }) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(
    Math.max(1, article.suggestedHsk - 1) as 1 | 2 | 3 | 4 | 5 | 6,
  );
  const [copied, setCopied] = useState<"prompt" | "text" | null>(null);
  const [simplified, setSimplified] = useState("");

  const simplifyPrompt = buildSimplifyPrompt(article.text, level);

  async function copyPrompt() {
    await navigator.clipboard.writeText(simplifyPrompt);
    setCopied("prompt");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyText() {
    await navigator.clipboard.writeText(article.text);
    setCopied("text");
    setTimeout(() => setCopied(null), 2000);
  }

  const importHref =
    "/import?" +
    new URLSearchParams({
      title: article.title,
      text: article.text,
      kind: "article",
    }).toString();

  const simplifiedImportHref = simplified.trim()
    ? "/import?" +
      new URLSearchParams({
        title: `${article.title}（HSK ${level} 改写）`,
        text: simplified,
        kind: "article",
      }).toString()
    : null;

  return (
    <div className="mt-8 space-y-8">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Chinese text</h2>
          <span className="text-xs text-zinc-500">
            {countChars(article.text)} characters
          </span>
        </div>
        <div className="mt-2 whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-4 text-base leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {article.text}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={copyText}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-500 dark:border-zinc-700"
          >
            {copied === "text" ? "Copied ✓" : "Copy text"}
          </button>
          <Link
            href={importHref}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Import as-is →
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/10">
        <h2 className="text-lg font-medium">
          Simplify this to your level first
        </h2>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          Three steps. Your Max Plan covers the claude.ai side; no API spend.
        </p>

        <ol className="mt-4 space-y-4 text-sm">
          <li>
            <div className="font-medium">1. Pick your target level and copy the prompt</div>
            <label className="mt-2 block">
              <span className="text-sm">Target HSK level: {level}</span>
              <input
                type="range"
                min={1}
                max={6}
                value={level}
                onChange={(e) =>
                  setLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)
                }
                className="mt-1 w-full"
              />
              <span className="text-xs text-zinc-500">
                The prompt keeps ~20% at HSK {Math.min(6, level + 1)} so you have new
                vocabulary to learn.
              </span>
            </label>
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-xs text-zinc-600 dark:text-zinc-400">
                View the full prompt
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {simplifyPrompt}
              </pre>
            </details>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={copyPrompt}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {copied === "prompt" ? "Copied ✓" : "Copy simplify prompt"}
              </button>
            </div>
          </li>

          <li>
            <div className="font-medium">2. Paste into claude.ai, copy the rewrite back</div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Opens in a new tab. Paste the prompt you just copied, wait for
              the rewrite, then select-all &amp; copy Claude&rsquo;s reply.
            </p>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              Open claude.ai →
            </a>
          </li>

          <li>
            <div className="font-medium">3. Paste the rewrite below</div>
            <textarea
              value={simplified}
              onChange={(e) => setSimplified(e.target.value)}
              rows={8}
              placeholder="Paste Claude&rsquo;s rewritten Chinese text here…"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white p-3 text-base leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {countChars(simplified)} Chinese chars
                {simplified.trim() &&
                  ` · original was ${countChars(article.text)}`}
              </span>
              {simplifiedImportHref ? (
                <Link
                  href={simplifiedImportHref}
                  className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Import simplified version →
                </Link>
              ) : (
                <button
                  disabled
                  className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white opacity-40"
                >
                  Import simplified version →
                </button>
              )}
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

function buildSimplifyPrompt(text: string, targetLevel: number): string {
  const above = Math.min(6, targetLevel + 1);
  return `You are helping me learn Mandarin Chinese. I'm at roughly HSK ${targetLevel}.

Please rewrite the Chinese text below so that:
- Most of the vocabulary (~75–80%) is at HSK ${targetLevel} or below — words I'm comfortable with.
- About 20–25% of the words are at HSK ${above} — just above my level, so I have new vocabulary to learn.
- Avoid words at HSK ${Math.min(6, above + 1)} or higher unless they are essential to the meaning and you flag them at the end.
- Keep the overall meaning, flow, and tone. Don't dumb it down into kid-speak — still feel like real adult Chinese.
- Prefer shorter sentences and simpler grammatical structures where possible.
- Keep it roughly the same length as the original.
- The first time a Chinese proper noun appears (person, place, company, product), follow it with its standard English equivalent or pinyin in parentheses — e.g. 汪滔 (Frank Wang), 深圳 (Shenzhen), 大疆 (DJI), 小红书 (Xiaohongshu / RedNote). Subsequent mentions can stay in Chinese only.

Return ONLY the rewritten Chinese text. No English, no explanation, no markdown. Just the Chinese paragraphs.

---

${text}`;
}

function countChars(s: string): number {
  // Count Chinese characters (basic CJK Unified Ideographs)
  let n = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) n++;
  }
  return n;
}
