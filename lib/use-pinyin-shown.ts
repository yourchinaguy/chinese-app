"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pinyinShown";
const SAME_TAB_EVENT = "pinyinShown:change";

// Hook: persisted boolean for "show pinyin upfront on cards" preference.
// Default off so cold starts don't unexpectedly reveal pronunciation.
// Same-tab sync: writers dispatch a custom event so every component using
// the hook re-renders when one toggles. Cross-tab sync via the native
// `storage` event.
export function usePinyinShown(): [boolean, (next: boolean) => void] {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setShown(true);
    } catch {}
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setShown(e.newValue === "1");
    }
    function onSameTab(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      setShown(Boolean(detail));
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(SAME_TAB_EVENT, onSameTab);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SAME_TAB_EVENT, onSameTab);
    };
  }, []);

  function update(next: boolean) {
    setShown(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: next }));
  }
  return [shown, update];
}
