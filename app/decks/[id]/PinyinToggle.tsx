"use client";

import { usePinyinShown } from "@/lib/use-pinyin-shown";

// Compact pill toggle: "Pinyin: on / off". Used in Review and Test headers.
export function PinyinToggle() {
  const [shown, setShown] = usePinyinShown();
  return (
    <button
      type="button"
      onClick={() => setShown(!shown)}
      title="Show pinyin upfront on cards"
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
        shown
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      pinyin {shown ? "on" : "off"}
    </button>
  );
}
