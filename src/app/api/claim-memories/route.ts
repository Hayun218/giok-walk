import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * 로그인하기 전에 이 휴대폰에서(가입 없이) 남긴 마음을, 로그인한 계정으로 옮긴다.
 * - Authorization: 로그인한 계정의 토큰
 * - body.anonToken: 로그인 직전의 익명 세션 토큰 (그 기억들의 주인이라는 증명)
 * 두 토큰을 모두 서버에서 확인하고, 익명 계정의 것만 옮긴다.
 */
export async function POST(request: Request) {
  const userToken = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const { anonToken } = (await request.json().catch(() => ({}))) as { anonToken?: string };
  if (!userToken || !anonToken) return NextResponse.json({ moved: 0 }, { status: 400 });

  const admin = supabaseAdmin();
  const [{ data: me }, { data: anon }] = await Promise.all([admin.auth.getUser(userToken), admin.auth.getUser(anonToken)]);
  if (!me.user || !anon.user) return NextResponse.json({ moved: 0 }, { status: 401 });
  if (!anon.user.is_anonymous || me.user.is_anonymous || anon.user.id === me.user.id) {
    return NextResponse.json({ moved: 0 }, { status: 400 });
  }

  const { data, error } = await admin
    .from("memories")
    .update({ author_id: me.user.id })
    .eq("author_id", anon.user.id)
    .select("id");
  if (error) return NextResponse.json({ moved: 0 }, { status: 500 });

  // 참여 기록·신고 기록도 같은 사람으로 이어 붙인다 (실패해도 기억 옮기기는 유지)
  await admin.from("activity").update({ user_id: me.user.id }).eq("user_id", anon.user.id);
  return NextResponse.json({ moved: data.length });
}
