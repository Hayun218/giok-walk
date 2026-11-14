/**
 * 감정 = 구슬 색. 방문객은 이 중 하나를 고른다 (decisions.md 4-4).
 * 실제 색값은 src/styles/tokens.css 의 --orb-{id}-from / -to 에 있다.
 * id 는 DB(memories.emotion)에 저장되므로 바꾸지 말고, 이름(label)만 바꾼다.
 */
export const EMOTIONS = [
  { id: "joy", label: "기쁨" },
  { id: "flutter", label: "설렘" },
  { id: "love", label: "사랑" },
  { id: "calm", label: "평온" },
  { id: "thanks", label: "고마움" },
  { id: "longing", label: "그리움" },
] as const;

export type EmotionId = (typeof EMOTIONS)[number]["id"];

export const EMOTION_IDS: readonly EmotionId[] = EMOTIONS.map((e) => e.id);

export function isEmotionId(value: unknown): value is EmotionId {
  return typeof value === "string" && (EMOTION_IDS as readonly string[]).includes(value);
}

export function emotionLabel(id: EmotionId): string {
  return EMOTIONS.find((e) => e.id === id)!.label;
}

/** CSS 배경값. 그라데이션 방향은 BI 규칙대로 왼쪽 위 → 오른쪽 아래로 고정. */
export function orbGradient(id: EmotionId | "brand"): string {
  return `linear-gradient(135deg, var(--orb-${id}-from), var(--orb-${id}-to))`;
}
