# Inbox — turn photos of Chinese text into decks

Drop page photos here and Claude Code will OCR them and **auto-import** them
as decks. No API cost: Claude Code's Max Plan already reads images
multimodally.

## How to use

1. **Create a subfolder for each source.** One folder = one article = one
   future deck. Name it something memorable, e.g.
   `inbox/beijing-subway-sign/` or `inbox/36kr-dji-interview/`.

2. **Drop the images inside that subfolder.** Phone photos, screenshots,
   scans — all fine. If an article spans multiple pages, name them so they
   sort in reading order: `page-01.jpg`, `page-02.jpg`, …

3. **Ask Claude Code to process it.** Open this repo in Claude Code and say:

   > Process inbox/36kr-dji-interview

   Claude Code will:
   - Read each image (sorted by filename)
   - Extract Chinese in reading order, concatenate into
     `inbox/<name>/extracted.md`
   - Run `npm run import-text` automatically, creating a vocab deck and a
     grammar deck (when patterns are present) in the app
   - Report the deck ids and URLs

4. **Review.** Open `/decks` in the app and the new decks are waiting.
   Optionally run `/starter`'s claude.ai simplify loop first if a piece
   turns out above your level, but you usually won't need to.

## Manually re-import

If you want to re-run the import without re-extracting photos:

```
npm run import-text -- inbox/<name>/extracted.md [--title="Custom title"]
```

Defaults:
- title: humanized folder name
- kind: article
- words: auto-selects all TARGET + PROPER_NOUN (same as UI default)
- grammar: all detected points

## Notes

- **Only personal-study content.** This exists so you (the user) can turn
  photos of signs, textbook pages, and articles into study material for
  yourself. Don't drop content you don't have the right to use.
- **Git-ignored.** Everything inside `inbox/<subfolder>/` is gitignored by
  default. Your images and extracted text stay on your laptop.
- **Claude Code required.** The extraction step needs Claude Code running
  locally. A friend you share the deployed app with wouldn't be able to
  do this yet — v2 will have an in-app upload + OCR.
