# Inbox — turn photos of Chinese text into decks

Drop page photos here and Claude Code will OCR them into importable text.
No API cost: Claude Code's Max Plan already reads images multimodally.

## How to use

1. **Create a subfolder for each source.** One folder = one article = one
   future deck. Name it something memorable, e.g.
   `inbox/beijing-subway-sign/` or `inbox/36kr-dji-interview/`.

2. **Drop the images inside that subfolder.** Phone photos, screenshots,
   scans — all fine. If an article spans multiple pages, name them so
   they sort in reading order: `page-01.jpg`, `page-02.jpg`, …

3. **Ask Claude Code to process it.** Open this repo in Claude Code and say
   something like:

   > Process inbox/36kr-dji-interview

   Claude Code will:
   - Read each image (sorted by filename)
   - Extract the Chinese text, page by page
   - Concatenate it into `inbox/<name>/extracted.md`
   - Flag anything it couldn't read so you can re-shoot a clearer photo

4. **Import into the app.** Open `inbox/<name>/extracted.md`, copy the text,
   paste into `/import` on your app. Optionally use the Claude.ai simplify
   loop first if it's above your level.

## Notes

- **Only personal-study content.** This exists so you (the user) can turn
  photos of signs, textbook pages, and articles into study material for
  yourself. Don't drop content you don't have the right to use.
- **Git-ignored.** Everything inside `inbox/<subfolder>/` is gitignored by
  default (see `.gitignore`) so your images don't get pushed publicly.
  `inbox/README.md` and `inbox/.gitkeep` are tracked.
- **No bulk automation yet.** This is a manual workflow you drive from
  Claude Code. If it starts feeling repetitive, we'll build a proper
  background processor later.
