import { Orb } from "@/components/Orb";
import type { EmotionId } from "@/lib/emotions";

/** 소인: 장소명과 날짜만 바뀐다 */
export function Stamp({ place, date, emotion = "brand", size = 84 }: { place: string; date: string; emotion?: EmotionId | "brand"; size?: number }) {
  return (
    <div
      className="relative flex shrink-0 flex-col items-center justify-center rounded-full border-2 border-text"
      style={{ width: size, height: size }}
      aria-label={`${place} ${date}`}
    >
      <div className="absolute inset-[5px] rounded-full border border-dashed border-text" />
      <span className="max-w-[70%] truncate font-title font-bold leading-none" style={{ fontSize: size * 0.12 }}>
        {place.split(" ")[0]}
      </span>
      <Orb emotion={emotion} size={size * 0.26} className="my-1" />
      <span className="font-date leading-none" style={{ fontSize: size * 0.1 }}>
        {date.slice(2)}
      </span>
    </div>
  );
}
