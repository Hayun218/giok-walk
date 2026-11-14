import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** 서버에서 공개 데이터(장소 이름, 공유된 기억)를 읽을 때. 로그인 없는 손님 권한. */
export function supabasePublic() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    noSession,
  );
}

/** RLS 를 우회하는 관리자 권한. 서버 전용 — 서명 URL, 운영자 초대처럼 꼭 필요한 곳에서만. */
export function supabaseAdmin() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY 가 없어요");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, noSession);
}
