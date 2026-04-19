# chinese-app

Personal Chinese-learning web app. Paste real content (blog post, lesson, podcast transcript, street-sign text via iPhone Live Text) → app filters to the ~20% just above your HSK level → flashcards and cloze exercises.

Built on Next.js 16 (App Router) + Turso (SQLite) + Tailwind.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What's here so far

- `/playground` — paste Chinese text, pick an HSK level, see it segmented and graded. Proves the pipeline works with no database.
- `/calibrate`, `/import`, `/decks` — coming next.

## Data

- `data/hsk.json` — HSK 1–6 word list (5000 entries, from [gigacool/hanyu-shuiping-kaoshi](https://github.com/gigacool/hanyu-shuiping-kaoshi), MIT). Includes pinyin with tone marks and English gloss. Translations originate from CC-CEDICT (CC BY-SA 4.0).

## Stack notes

- Chinese segmentation: [`segmentit`](https://github.com/linonetwo/segmentit) — pure JS, works in Node and browser.
- No LLM / API calls in v1 — zero ongoing cost. API integration deferred to Phase 3 (chat tutor).
