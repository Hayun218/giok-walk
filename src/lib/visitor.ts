"use client";

import { useEffect, useState } from "react";
import { isAuthApiError, type User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ActivityType } from "@/lib/types";

/**
 * 방문객 세션. 로그인 화면 없이 익명 계정을 만들고, 이 브라우저에 보관한다.
 * 나중에 카카오·이메일을 연결하면 같은 계정이 정식 계정이 된다.
 */
let pending: Promise<User> | null = null;

export function ensureVisitor(): Promise<User> {
  // 여러 화면 조각이 동시에 불러도 익명 계정은 하나만 만든다
  pending ??= (async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      // 서버에 계정이 아직 있는지 확인 (지워진 계정의 세션이 남아 있으면 새로 만든다)
      const { data: checked, error } = await supabase.auth.getUser();
      if (!error && checked.user) return checked.user;
      // 서버가 "계정이 없다"고 분명히 답할 때만 새로 만든다.
      // 네트워크 끊김·화면 이동으로 요청이 중단된 경우에는 세션을 그대로 둔다 (지우면 내 기억을 잃는다)
      const gone = isAuthApiError(error) && (error.code === "user_not_found" || error.status === 403 || error.status === 404);
      if (!gone) return data.session.user;
      await supabase.auth.signOut({ scope: "local" });
    }
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.user) throw error ?? new Error("anonymous sign-in failed");
    return signed.user;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

/** 세션이 있으면 돌려주고, 없으면 만들지 않는다 (내 기억 화면 등) */
export function useCurrentUser(options: { create?: boolean } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let alive = true;
    (async () => {
      try {
        const u = options.create ? await ensureVisitor() : (await supabase.auth.getSession()).data.session?.user ?? null;
        if (alive) setUser(u);
      } finally {
        if (alive) setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [options.create]);

  return { user, ready };
}

export async function logActivity(placeId: string, type: ActivityType) {
  try {
    const user = await ensureVisitor();
    await supabaseBrowser().from("activity").insert({ place_id: placeId, user_id: user.id, type });
  } catch {
    // 참여 기록 실패는 방문객 흐름을 막지 않는다
  }
}
