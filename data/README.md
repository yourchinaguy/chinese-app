# Data sources

## `hsk.json` — HSK 1–6 vocabulary (5000 words)

Source: [gigacool/hanyu-shuiping-kaoshi](https://github.com/gigacool/hanyu-shuiping-kaoshi) (MIT).
Shape: `{ level: 1..6, id: number, hanzi: string, pinyin: string, translations: string[] }`.

Pinyin uses tone marks. Translations originate from CC-CEDICT, which is licensed CC BY-SA 4.0 — attributed here.
