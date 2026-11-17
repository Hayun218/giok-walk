"use client";

import { useSyncExternalStore } from "react";
import { readThemeChoice, saveThemeChoice, THEME_CHOICES, THEME_EVENT, type ThemeChoice } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

/** 화면 밝기 고르기: 밝게(기본) / 어둡게 / 휴대폰 설정대로 */
export function ThemeSetting() {
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, readThemeChoice, () => "light");
  return (
    <section className="flex flex-col gap-2" aria-label="화면 밝기">
      <h2 className="text-md">화면 밝기</h2>
      <div role="radiogroup" aria-label="화면 밝기" className="flex gap-2">
        {THEME_CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={choice === c.id}
            onClick={() => saveThemeChoice(c.id)}
            className={`flex-1 rounded-full border px-3 py-2 text-sm ${
              choice === c.id ? "border-text bg-surface" : "border-border text-text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
