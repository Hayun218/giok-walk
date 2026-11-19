"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export const PASSWORD_MIN = 8;

/** 가입: 지금의 익명 계정을 그대로 정식 계정으로 바꾼다 → 남긴 마음이 그대로 내 것으로 남는다 */
export async function signUpKeepingMemories(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.updateUser({ email, password });
  if (!error) return { ok: true };
  if (error.code === "email_exists" || /already/i.test(error.message)) {
    return { ok: false, message: "이미 가입한 이메일이에요. 로그인하면 지금 남긴 마음도 함께 옮겨 드려요." };
  }
  if (error.code === "weak_password") return { ok: false, message: `비밀번호를 ${PASSWORD_MIN}자 이상으로 정해 주세요.` };
  if (error.code === "email_address_invalid" || /invalid/i.test(error.message)) {
    return { ok: false, message: "이메일 주소를 확인해 주세요." };
  }
  return { ok: false, message: "가입하지 못했어요. 잠시 뒤 다시 해 볼까요?" };
}

/**
 * 로그인: 로그인 전에 이 휴대폰에서 가입 없이 남긴 마음이 있으면, 로그인한 계정으로 옮긴다.
 */
export async function signInKeepingMemories(
  email: string,
  password: string,
): Promise<{ ok: true; moved: number } | { ok: false; message: string }> {
  const supabase = supabaseBrowser();
  const { data: before } = await supabase.auth.getSession();
  const anonToken = before.session?.user.is_anonymous ? before.session.access_token : null;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return { ok: false, message: "이메일이나 비밀번호가 맞지 않아요." };

  if (!anonToken) return { ok: true, moved: 0 };
  const res = await fetch("/api/claim-memories", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ anonToken }),
  });
  const { moved = 0 } = (await res.json().catch(() => ({}))) as { moved?: number };
  return { ok: true, moved };
}
