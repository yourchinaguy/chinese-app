import rawHsk from "@/data/hsk.json";

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HskEntry = {
  hanzi: string;
  pinyin: string;
  translations: string[];
  level: HskLevel;
  id: number;
};

const entries: HskEntry[] = (rawHsk as HskEntry[]).map((e) => ({
  ...e,
  level: e.level as HskLevel,
}));

const byHanzi = new Map<string, HskEntry>();
const byLevel = new Map<HskLevel, HskEntry[]>();
for (const e of entries) {
  byHanzi.set(e.hanzi, e);
  const list = byLevel.get(e.level) ?? [];
  list.push(e);
  byLevel.set(e.level, list);
}

export function getHskEntry(hanzi: string): HskEntry | null {
  return byHanzi.get(hanzi) ?? null;
}

export function getHskLevel(hanzi: string): HskLevel | null {
  return byHanzi.get(hanzi)?.level ?? null;
}

export function getEntriesByLevel(level: HskLevel): HskEntry[] {
  return byLevel.get(level) ?? [];
}

export function allHskEntries(): HskEntry[] {
  return entries;
}

export function sampleCalibrationWords(perLevel = 10): HskEntry[] {
  const out: HskEntry[] = [];
  for (const level of [1, 2, 3, 4, 5, 6] as HskLevel[]) {
    const pool = byLevel.get(level) ?? [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    out.push(...shuffled.slice(0, perLevel));
  }
  return out.sort(() => Math.random() - 0.5);
}
