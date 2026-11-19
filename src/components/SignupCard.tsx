"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PASSWORD_MIN, signUpKeepingMemories } from "@/lib/account";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * "내 엽서 간직하기" — 가입 없이 다 써 본 다음에 권한다.
 * 가입하면 지금 익명 계정이 그대로 정식 계정이 되어, 이미 남긴 마음이 모두 내 것으로 남는다.
 */
export function SignupCard({ context, onDone }: { context: "done" | "me"; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD_MIN) return setMessage(`비밀번호를 ${PASSWORD_MIN}자 이상으로 정해 주세요.`);
    setBusy(true);
    const result = await signUpKeepingMemories(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      setJoined(true);
      onDone?.();
    } else setMessage(result.message);
  }

  async function kakao() {
    const redirectTo = `${window.location.origin}/me`;
    const { error } = await supabaseBrowser().auth.linkIdentity({ provider: "kakao", options: { redirectTo } });
    if (error) setMessage("카카오 가입은 준비 중이에요. 이메일로 먼저 가입해 주세요.");
  }

  if (joined) {
    return (
      <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-text bg-surface p-5" data-testid="signup-done">
        <h2 className="text-lg">가입했어요</h2>
        <p className="text-sm text-text-muted">이제 다시 와도, 휴대폰을 바꿔도 내 엽서가 그대로 남아요.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-5" aria-label="내 엽서 간직하기">
      <h2 className="text-lg">내 엽서 간직하기</h2>
      <p className="text-sm">
        가입하면 다시 와도, 휴대폰을 바꿔도 {context === "done" ? "방금 남긴 엽서가" : "내 엽서가"} 그대로 남아요.{" "}
        <span className="text-text-muted">가입하지 않으면 이 휴대폰에서만 볼 수 있어요.</span>
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          aria-label="이메일"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-full border border-border bg-surface px-4 outline-none focus:border-text"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          aria-label="비밀번호"
          placeholder={`비밀번호 (${PASSWORD_MIN}자 이상)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 rounded-full border border-border bg-surface px-4 outline-none focus:border-text"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "가입하는 중…" : "가입하고 간직하기"}
        </Button>
      </form>
      <Button variant="secondary" onClick={kakao}>
        카카오로 시작하기
      </Button>
      {message && (
        <p className="text-sm text-text-muted" role="status">
          {message}
        </p>
      )}
      <Link href="/me/login" className="self-center py-1 text-sm text-text-muted underline-offset-4 hover:underline">
        이미 가입했어요 · 로그인
      </Link>
    </section>
  );
}
