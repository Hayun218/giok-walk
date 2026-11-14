"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { supabaseBrowser } from "@/lib/supabase/client";

/** 다른 기기에서 연결해 둔 계정으로 들어오기 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const supabase = supabaseBrowser();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/me` : undefined;

  return (
    <PageShell back={{ href: "/me", label: "내 기억" }} className="gap-5 pt-4">
      <h1 className="text-xl">연결해 둔 계정으로 들어가기</h1>
      <p className="text-sm text-text-muted">이 기기에서 남긴 마음이 있다면, 들어가기 전에 먼저 계정을 연결해 주세요.</p>
      <Button
        variant="accent"
        onClick={async () => {
          const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo } });
          if (error) setNote("카카오 로그인은 준비 중이에요.");
        }}
      >
        카카오로 들어가기
      </Button>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
          setNote(error ? "연결된 계정을 찾지 못했어요." : "메일함을 확인해 주세요.");
        }}
      >
        <input
          type="email"
          required
          aria-label="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="min-h-12 rounded-full border border-border bg-surface px-4 outline-none focus:border-text"
        />
        <Button type="submit" variant="secondary">
          이메일로 들어가기
        </Button>
      </form>
      {note && <p className="text-sm text-text-muted">{note}</p>}
    </PageShell>
  );
}
