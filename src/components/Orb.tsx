import { orbGradient, type EmotionId } from "@/lib/emotions";

/** 기본 도형인 구슬. 2D 화면(목록·대체 보기)에서 쓴다. */
export function Orb({
  emotion = "brand",
  size = 48,
  className = "",
}: {
  emotion?: EmotionId | "brand";
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: orbGradient(emotion),
        boxShadow: "var(--shadow-orb)",
      }}
    />
  );
}
