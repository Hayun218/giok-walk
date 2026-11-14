"use client";

export type ShareResult = "shared" | "copied" | "failed";

export function shareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}

/** 휴대폰 공유 창을 열고, 안 되면 링크를 복사한다 */
export async function shareMemory(token: string, placeName: string): Promise<ShareResult> {
  const url = shareUrl(token);
  const data = { title: "기억산책", text: `${placeName}에 마음을 남겼어요.`, url };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
