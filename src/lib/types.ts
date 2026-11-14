import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];
export type Place = Tables["places"]["Row"];
export type Memory = Tables["memories"]["Row"];
export type Visibility = Database["public"]["Enums"]["memory_visibility"];
export type Recipient = Database["public"]["Enums"]["recipient_kind"];
export type ObjectKind = Database["public"]["Enums"]["object_kind"];
export type ActivityType = Database["public"]["Enums"]["activity_type"];

/** 받는 사람 (decisions 4-5) */
export const RECIPIENTS: { id: Recipient; label: string; hint: string }[] = [
  { id: "stranger", label: "모르는 누군가에게", hint: "이곳에 올 다른 사람이 읽어요" },
  { id: "future_me", label: "다시 올 나에게", hint: "다음에 왔을 때의 나에게" },
  { id: "companion", label: "함께 온 사람에게", hint: "링크로 보내 줄 수 있어요" },
  { id: "this_place", label: "이곳에게", hint: "이 자리에 하는 말" },
];

export const VISIBILITIES: { id: Visibility; label: string; hint: string }[] = [
  { id: "public", label: "모두에게", hint: "이곳에 오는 누구나 볼 수 있어요" },
  { id: "link", label: "링크를 받은 사람에게", hint: "내가 보낸 사람만 열 수 있어요" },
  { id: "private", label: "나만", hint: "나에게만 보여요" },
];

export const LETTER_MAX = 200;

export function recipientLabel(id: Recipient) {
  return RECIPIENTS.find((r) => r.id === id)?.label ?? "";
}

/** 2026.11.14 형식 (소인 날짜) */
export function stampDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** DB 오류 코드를 방문객에게 보여 줄 말로 바꾼다 */
export function friendlyError(message: string | undefined): string {
  if (!message) return "잠시 문제가 생겼어요. 다시 해 볼까요?";
  if (message.includes("blocked_word")) return "쓸 수 없는 말이 들어 있어요. 조금만 고쳐 주세요.";
  if (message.includes("daily_limit")) return "오늘은 이곳에 마음을 충분히 남겼어요. 내일 또 남겨 주세요.";
  if (message.includes("place_not_open")) return "지금은 이곳에 마음을 남길 수 없어요.";
  if (message.includes("public_memory_has_no_photo")) return "모두에게 보이는 마음에는 사진을 붙일 수 없어요.";
  return "잠시 문제가 생겼어요. 다시 해 볼까요?";
}
