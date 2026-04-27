"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { analyzeText, createDeck, type AnalyzeResult } from "./actions";
import { splitCombinedGloss } from "@/lib/gloss";
import type { GradedWord, Verdict } from "@/lib/grade";
import type { GrammarMatch } from "@/lib/grammar";
import type { HskLevel } from "@/lib/hsk";

const MAX_PREVIEW_GLOSSES = 3;

type Kind = "article" | "podcast" | "other";

const verdictStyles: Record<Verdict, string> = {
  KNOWN: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  TARGET: "bg-amber-200 text-amber-950 font-medium dark:bg-amber-500/40 dark:text-amber-100",
  TOO_HARD: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  BEYOND_HSK: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  PROPER_NOUN: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
};

type Prefill = {
  text: string;
  title: string;
  kind: Kind;
  fromStarterSlug: string | null;
};

export function Import({
  defaultLevel,
  prefill,
}: {
  defaultLevel: HskLevel;
  prefill?: Prefill;
}) {
  const [text, setText] = useState(prefill?.text ?? "");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [kind, setKind] = useState<Kind>(prefill?.kind ?? "article");
  const [level, setLevel] = useState<HskLevel>(defaultLevel);
  const fromStarterSlug = prefill?.fromStarterSlug ?? null;
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedGrammar, setSelectedGrammar] = useState<Set<string>>(new Set());
  const [analyzing, startAnalyzing] = useTransition();
  const [creating, startCreating] = useTransition();

  function analyze() {
    startAnalyzing(async () => {
      const r = await analyzeText(text, level);
      setResult(r);
      // Default-select TARGET words and proper nouns (both high-value).
      const defaults = new Set<string>();
      const seen = new Set<string>();
      for (const g of r.graded) {
        if (seen.has(g.hanzi)) continue;
        seen.add(g.hanzi);
        if (g.verdict === "TARGET" || g.verdict === "PROPER_NOUN")
          defaults.add(g.hanzi);
      }
      setSelected(defaults);
      // Default-select all detected grammar points.
      setSelectedGrammar(new Set(r.grammar.map((m) => m.pointId)));
    });
  }

  function toggle(hanzi: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hanzi)) next.delete(hanzi);
      else next.add(hanzi);
      return next;
    });
  }

  function toggleGrammar(pointId: string) {
    setSelectedGrammar((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) next.delete(pointId);
      else next.add(pointId);
      return next;
    });
  }

  function create() {
    if (!result) return;
    startCreating(async () => {
      await createDeck({
        title: title.trim() || "Untitled deck",
        kind,
        text,
        selectedHanzi: Array.from(selected),
        selectedGrammarPointIds: Array.from(selectedGrammar),
        fromStarterSlug,
      });
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Import content</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Paste a blog post, textbook lesson, podcast transcript, or any other
        Chinese text. The app filters to words just above your level and makes
        them a deck.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Podcast — AI in China ep 42"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="article">Article</option>
              <option value="podcast">Podcast</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Your HSK level: {level}</span>
            <input
              type="range"
              min={1}
              max={6}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as HskLevel)}
              className="mt-2 w-full"
            />
          </label>
        </div>

        <KindHelp kind={kind} />

        <label className="block">
          <span className="text-sm font-medium">Chinese text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste Chinese text here…    粘贴中文内容…"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-3 text-base leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          onClick={analyze}
          disabled={analyzing || !text.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {result && (
        <Analysis
          result={result}
          selected={selected}
          toggle={toggle}
          selectedGrammar={selectedGrammar}
          toggleGrammar={toggleGrammar}
          create={create}
          creating={creating}
        />
      )}
    </main>
  );
}

function Analysis({
  result,
  selected,
  toggle,
  selectedGrammar,
  toggleGrammar,
  create,
  creating,
}: {
  result: AnalyzeResult;
  selected: Set<string>;
  toggle: (hanzi: string) => void;
  selectedGrammar: Set<string>;
  toggleGrammar: (pointId: string) => void;
  create: () => void;
  creating: boolean;
}) {
  const total = result.totalChineseTokens || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  const targetWords = dedupe(result.graded.filter((g) => g.verdict === "TARGET"));
  const beyondWords = dedupe(result.graded.filter((g) => g.verdict === "BEYOND_HSK"));
  const tooHardWords = dedupe(result.graded.filter((g) => g.verdict === "TOO_HARD"));
  const properNouns = dedupe(result.graded.filter((g) => g.verdict === "PROPER_NOUN"));

  const fit = fitVerdict(pct(result.counts.TARGET), pct(result.counts.TOO_HARD));

  return (
    <div className="mt-10 space-y-8">
      <section>
        <h2 className="text-lg font-medium">Breakdown</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Known" v="KNOWN" pct={pct(result.counts.KNOWN)} count={result.counts.KNOWN} />
          <Stat label="Target" v="TARGET" pct={pct(result.counts.TARGET)} count={result.counts.TARGET} />
          <Stat label="Too hard" v="TOO_HARD" pct={pct(result.counts.TOO_HARD)} count={result.counts.TOO_HARD} />
          <Stat label="Beyond HSK" v="BEYOND_HSK" pct={pct(result.counts.BEYOND_HSK)} count={result.counts.BEYOND_HSK} />
        </div>
        <p className={`mt-3 text-sm ${fit.className}`}>{fit.message}</p>
      </section>

      {properNouns.length > 0 && (
        <WordPicker
          title={`Names & proper nouns (${properNouns.length} unique)`}
          subtitle="Companies, people, places, products. Default selected — handy to recognize; uncheck any you don't want to memorize."
          words={properNouns}
          selected={selected}
          toggle={toggle}
        />
      )}

      <WordPicker
        title={`Target words — check to add (${targetWords.length} unique)`}
        subtitle="These are at exactly your +1 level. Default selected."
        words={targetWords}
        selected={selected}
        toggle={toggle}
      />

      {beyondWords.length > 0 && (
        <WordPicker
          title={`Beyond HSK 1–6 (${beyondWords.length} unique)`}
          subtitle="Words not in the HSK 1–6 list. Business terms, names, newer vocabulary, or compounds. Pick any you want to learn."
          words={beyondWords}
          selected={selected}
          toggle={toggle}
          defaultUnchecked
          hideEmpty
        />
      )}

      {tooHardWords.length > 0 && (
        <WordPicker
          title={`Too hard (${tooHardWords.length} unique)`}
          subtitle="More than +1 above your level. Usually skip, but you can still add them."
          words={tooHardWords}
          selected={selected}
          toggle={toggle}
          defaultUnchecked
          hideEmpty
        />
      )}

      {result.grammar.length > 0 && (
        <GrammarSection
          matches={result.grammar}
          selected={selectedGrammar}
          toggle={toggleGrammar}
        />
      )}

      <section className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {describeSelection(selected.size, selectedGrammar.size)}
          </span>
          <button
            onClick={create}
            disabled={creating || (selected.size === 0 && selectedGrammar.size === 0)}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating
              ? "Creating…"
              : deckActionLabel(selected.size, selectedGrammar.size)}
          </button>
        </div>
      </section>
    </div>
  );
}

function describeSelection(words: number, grammar: number): string {
  if (words === 0 && grammar === 0) return "nothing selected";
  const parts: string[] = [];
  if (words > 0) parts.push(`${words} word${words === 1 ? "" : "s"}`);
  if (grammar > 0)
    parts.push(`${grammar} grammar point${grammar === 1 ? "" : "s"}`);
  return parts.join(" + ") + " selected";
}

function deckActionLabel(words: number, grammar: number): string {
  if (words > 0 && grammar > 0) return "Create both decks →";
  if (words > 0) return "Create vocab deck →";
  if (grammar > 0) return "Create grammar deck →";
  return "Create deck →";
}

function WordPicker({
  title,
  subtitle,
  words,
  selected,
  toggle,
  hideEmpty = false,
}: {
  title: string;
  subtitle: string;
  words: GradedWord[];
  selected: Set<string>;
  toggle: (hanzi: string) => void;
  defaultUnchecked?: boolean;
  hideEmpty?: boolean;
}) {
  if (words.length === 0) return null;

  // Pre-clean glosses: drop CC-CEDICT metadata noise, cap to top N meanings.
  const prepared = words.map((w) => {
    const cleaned = splitCombinedGloss(w.gloss).slice(0, MAX_PREVIEW_GLOSSES);
    return { ...w, glossList: cleaned };
  });

  // For beyond-HSK / too-hard sections, hide rows with zero info — those are
  // mostly segmenter false-compounds (两个, 很多, 很大的) where neither HSK
  // nor CEDICT has anything. They're un-selectable signal-wise.
  const visible = hideEmpty
    ? prepared.filter((w) => w.glossList.length > 0 || w.pinyin)
    : prepared;
  const hidden = prepared.length - visible.length;

  if (visible.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      {hidden > 0 && (
        <p className="mt-1 text-xs text-zinc-500">
          {hidden} word{hidden === 1 ? "" : "s"} hidden — no dictionary entry.
        </p>
      )}
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((w) => {
          const isOn = selected.has(w.hanzi);
          return (
            <li key={w.hanzi}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition ${
                  isOn
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(w.hanzi)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl">{w.hanzi}</span>
                    <span className="text-xs text-zinc-500">
                      {w.pinyin ?? ""}
                    </span>
                    {w.hskLevel && (
                      <span className="ml-auto text-xs text-zinc-400">
                        HSK {w.hskLevel}
                      </span>
                    )}
                  </div>
                  {w.glossList.length > 0 && (
                    <div
                      className="mt-0.5 line-clamp-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400"
                      title={w.glossList.join(" · ")}
                    >
                      {w.glossList.join(" · ")}
                    </div>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({
  label,
  v,
  pct,
  count,
}: {
  label: string;
  v: Verdict;
  pct: number;
  count: number;
}) {
  return (
    <div className={`rounded-md p-3 ${verdictStyles[v]}`}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-xl font-semibold">{pct}%</div>
      <div className="text-xs opacity-75">{count} tokens</div>
    </div>
  );
}

function fitVerdict(targetPct: number, tooHardPct: number) {
  if (tooHardPct > 25) {
    return {
      className: "text-rose-700 dark:text-rose-300",
      message: "Too hard for comprehensible input — try an easier source, or raise your HSK level if you already know more than you think.",
    };
  }
  if (targetPct < 5 && tooHardPct < 5) {
    return {
      className: "text-zinc-600 dark:text-zinc-400",
      message: "Not much new here. Good fluency read — but try something harder to grow vocabulary.",
    };
  }
  return {
    className: "text-emerald-700 dark:text-emerald-300",
    message: "Good fit — the target section is where new vocabulary lives.",
  };
}

function KindHelp({ kind }: { kind: Kind }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      {kind === "article" && <ArticleHelp />}
      {kind === "podcast" && <PodcastHelp />}
      {kind === "other" && <OtherHelp />}
    </div>
  );
}

function ArticleHelp() {
  return (
    <div className="space-y-1">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">How to grab an article</div>
      <ol className="ml-4 list-decimal space-y-0.5">
        <li>
          Open it in your browser. If it&rsquo;s cluttered with nav and ads,
          use <strong>Reader Mode</strong> first (Safari: <kbd>⌘⇧R</kbd>;
          Chrome: three-dot menu → Cast, share, and more → Distill).
        </li>
        <li>Select just the article body — skip headers, menus, comments.</li>
        <li>Copy → paste into the box below.</li>
      </ol>
      <div className="text-xs text-zinc-500">
        Good sources for business Chinese: <em>36氪, 虎嗅, 财经, 晚点LatePost</em>.
        For WeChat articles, open the share link in Safari first.
      </div>
    </div>
  );
}

function PodcastHelp() {
  return (
    <div className="space-y-2">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">How to get a podcast transcript</div>
      <ol className="ml-4 list-decimal space-y-1">
        <li>
          <strong>Check the show&rsquo;s own site or the episode page on{" "}
          <a href="https://www.xiaoyuzhoufm.com" target="_blank" rel="noreferrer" className="underline">小宇宙</a></strong>
          {" "}— many Chinese podcasts (声东击西, 商业就是这样, 硅谷101 …) publish
          episode notes with a full transcript or generous excerpts. Copy what&rsquo;s there.
        </li>
        <li>
          <strong>YouTube episode?</strong> Paste the video URL into{" "}
          <a href="https://youtubetotranscript.com" target="_blank" rel="noreferrer" className="underline">
            youtubetotranscript.com
          </a>{" "}
          (free). It pulls YouTube&rsquo;s auto-generated captions in Chinese.
        </li>
        <li>
          <strong>No transcript anywhere?</strong> Run the audio through{" "}
          <a href="https://goodsnooze.gumroad.com/l/macwhisper" target="_blank" rel="noreferrer" className="underline">
            MacWhisper
          </a>{" "}
          (Mac app, one-time purchase, runs locally, handles Chinese well).
          Drop the mp3 in, pick the Chinese model, export the text.
        </li>
      </ol>
      <div className="text-xs text-zinc-500">
        Paste the transcript below. Shorter excerpts (a few paragraphs) usually
        work better than full 1-hour transcripts — too much &ldquo;too hard&rdquo;
        content will discourage you.
      </div>
    </div>
  );
}

function OtherHelp() {
  return (
    <div className="space-y-2">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">Any other Chinese text</div>
      <p>
        Chat messages, textbook chapters, song lyrics, microblog posts, dialog
        from a lesson, handwritten notes (type them out) — anything goes. Just
        paste it below.
      </p>
      <p className="text-xs text-zinc-500">
        <strong>Photos of Chinese?</strong> Drop them in <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">inbox/&lt;name&gt;/</code> in the repo
        and ask Claude Code to process them — see <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">inbox/README.md</code> for the workflow.
      </p>
    </div>
  );
}

function GrammarSection({
  matches,
  selected,
  toggle,
}: {
  matches: GrammarMatch[];
  selected: Set<string>;
  toggle: (pointId: string) => void;
}) {
  const sorted = [...matches].sort((a, b) => a.approxHsk - b.approxHsk);
  return (
    <section>
      <h2 className="text-lg font-medium">
        Grammar points — check to add ({matches.length})
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Default selected. Checked points become a separate &ldquo;grammar&rdquo;
        deck you can review alongside vocab. Each link opens the canonical
        explanation on Chinese Grammar Wiki.
      </p>
      <ul className="mt-4 space-y-3">
        {sorted.map((m) => {
          const isOn = selected.has(m.pointId);
          return (
            <li
              key={m.pointId}
              className={`rounded-lg border p-4 transition ${
                isOn
                  ? "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-900/20"
                  : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(m.pointId)}
                  className="mt-1.5"
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-violet-900 dark:text-violet-200">
                        {m.patternZh}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-white px-2 py-0.5 dark:bg-zinc-900">
                        {m.cefr}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 dark:bg-zinc-900">
                        ~HSK {m.approxHsk}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {m.description}
                  </p>
                  <blockquote className="mt-3 rounded-md border-l-2 border-violet-400 bg-white px-3 py-2 text-base leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    <GrammarHighlight
                      sentence={m.sentence}
                      matchedText={m.matchedText}
                      matchStart={m.matchStart}
                    />
                  </blockquote>
                  <div className="mt-3">
                    <a
                      href={m.wikiUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-violet-700 underline hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
                    >
                      Read more on Chinese Grammar Wiki →
                    </a>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GrammarHighlight({
  sentence,
  matchedText,
  matchStart,
}: {
  sentence: string;
  matchedText: string;
  matchStart: number;
}) {
  const before = sentence.slice(0, matchStart);
  const after = sentence.slice(matchStart + matchedText.length);
  return (
    <>
      <span>{before}</span>
      <mark className="rounded bg-violet-200/80 px-0.5 font-medium text-violet-950 dark:bg-violet-500/40 dark:text-violet-100">
        {matchedText}
      </mark>
      <span>{after}</span>
    </>
  );
}

function dedupe<T extends { hanzi: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (seen.has(w.hanzi)) return false;
    seen.add(w.hanzi);
    return true;
  });
}

