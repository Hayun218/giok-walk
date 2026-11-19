"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { signInKeepingMemories } from "@/lib/account";
import { supabaseBrowser } from "@/lib/supabase/client";

/** 로그인: 이 휴대폰에서 가입 없이 남긴 마음이 있으면 로그인한 계정으로 함께 옮긴다 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await signInKeepingMemories(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setNote(result.message);
    router.push(result.moved > 0 ? `/me?moved=${result.moved}` : "/me");
  }

  async function kakao() {
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/me` },
    });
    if (error) setNote("카카오 로그인은 준비 중이에요.");
  }

  const field = "min-h-12 rounded-full border border-border bg-surface px-4 outline-none focus:border-text";
  return (
    <PageShell back={{ href: "/me", label: "내 기억" }} className="gap-5 pt-4">
      <h1 className="text-xl">로그인</h1>
      <p className="text-sm text-text-muted">
        로그인하면 어느 휴대폰에서든 내 엽서를 볼 수 있어요. 이 휴대폰에서 가입 없이 남긴 마음도 함께 옮겨 드려요.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input type="email" required autoComplete="email" aria-label="이메일" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <input
          type="password"
          required
          autoComplete="current-password"
          aria-label="비밀번호"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
        <Button type="submit" disabled={busy}>
          {busy ? "로그인하는 중…" : "로그인"}
        </Button>
      </form>
      <Button variant="secondary" onClick={kakao}>
        카카오로 로그인
      </Button>
      {note && (
        <p className="text-sm text-text-muted" role="status">
          {note}
        </p>
      )}
    </PageShell>
  );
}
