"use client";

import { Orb } from "@/components/Orb";
import { EMOTIONS, type EmotionId } from "@/lib/emotions";

/** 색 고르기 = 감정 고르기 */
export function EmotionPicker({ value, onChange }: { value: EmotionId | null; onChange: (id: EmotionId) => void }) {
  return (
    <div role="radiogroup" aria-label="마음 색" className="grid grid-cols-3 gap-x-3 gap-y-5">
      {EMOTIONS.map((e) => {
        const selected = value === e.id;
        return (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(e.id)}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] py-2"
          >
            <span
              className={`rounded-full p-1 transition-transform duration-[var(--duration-fast)] ${
                selected ? "scale-110 ring-2 ring-text ring-offset-2 ring-offset-bg" : ""
              }`}
            >
              <Orb emotion={e.id} size={60} />
            </span>
            <span className={`text-sm ${selected ? "font-medium" : "text-text-muted"}`}>{e.label}</span>
          </button>
        );
      })}
    </div>
  );
}
