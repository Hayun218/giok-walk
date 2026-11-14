import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * 운영자 초대 코드로 지금 계정을 운영자로 만든다.
 * 코드는 환경 변수(OPERATOR_INVITE_CODE)에만 있다. 코드에 넣지 않는다.
 */
export async function POST(request: Request) {
  const expected = process.env.OPERATOR_INVITE_CODE ?? "";
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const { code } = (await request.json().catch(() => ({}))) as { code?: string };

  if (expected.length < 8 || !token || typeof code !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { error: upErr } = await admin.from("profiles").update({ role: "operator" }).eq("id", data.user.id);
  if (upErr) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
