"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Orb } from "@/components/Orb";
import { ThemeSetting } from "@/components/ThemeSetting";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import type { EmotionId } from "@/lib/emotions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { stampDate, type Memory } from "@/lib/types";
import { useCurrentUser } from "@/lib/visitor";

type Row = Pick<Memory, "id" | "emotion" | "letter" | "created_at" | "visibility" | "status"> & {
  places: { id: string; name: string; slug: string; venue_name: string | null } | null;
};

/** 내가 남긴 마음을 장소별로 모아 본다 */
export function MyMemories() {
  const { user, ready } = useCurrentUser();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    supabaseBrowser()
      .from("memories")
      .select("id, emotion, letter, created_at, visibility, status, places(id, name, slug, venue_name)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [ready, user]);

  const groups = useMemo(() => {
    const map = new Map<string, { place: NonNullable<Row["places"]>; items: Row[] }>();
    for (const r of (user ? rows : []) ?? []) {
      if (!r.places) continue;
      const g = map.get(r.places.id) ?? { place: r.places, items: [] };
      g.items.push(r);
      map.set(r.places.id, g);
    }
    return [...map.values()];
  }, [rows, user]);

  return (
    <PageShell className="gap-8 pt-4">
      <h1 className="text-2xl">내 기억</h1>

      {ready && (rows !== null || !user) && groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-text-muted">
          <Orb size={40} />
          <p>아직 남긴 마음이 없어요.</p>
          <p className="text-sm">행사장이나 장소에 있는 QR을 찍으면 마음을 남길 수 있어요.</p>
        </div>
      )}

      {groups.map(({ place, items }) => (
        <section key={place.id} className="flex flex-col gap-3" aria-label={place.name}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg">{place.name}</h2>
            <Link href={`/p/${place.slug}/view`} className="text-sm text-text-muted">
              그 자리 보기 →
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((m) => (
              <li key={m.id}>
                <Link href={`/m/${m.id}`} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3">
                  <Orb emotion={m.emotion as EmotionId} size={28} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-title">{m.letter}</span>
                  <span className="shrink-0 font-date text-xs text-text-muted">{stampDate(m.created_at).slice(5)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-auto flex flex-col gap-6">
        <ThemeSetting />
        {ready && <AccountBox />}
      </div>
    </PageShell>
  );
}

/** 익명 → 정식 계정 연결 (decisions 2-7) */
function AccountBox() {
  const { user } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const supabase = supabaseBrowser();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/me` : undefined;

  if (!user) return null;

  if (!user.is_anonymous) {
    const via = user.app_metadata?.provider === "kakao" ? "카카오" : user.email ?? "계정";
    return (
      <section className="mt-auto flex flex-col gap-2 rounded-[var(--radius-md)] bg-surface-sunken p-4 text-sm">
        <p>{via}로 연결되어 있어요. 다른 기기에서도 내 기억을 볼 수 있어요.</p>
        <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => location.reload())}>
          이 기기에서 나가기
        </Button>
      </section>
    );
  }

  async function kakao() {
    const { error } = await supabase.auth.linkIdentity({ provider: "kakao", options: { redirectTo } });
    if (error) setNote("카카오 연결은 준비 중이에요. 이메일로 먼저 연결해 주세요.");
  }

  async function linkEmail(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    setNote(error ? "이 이메일은 쓸 수 없어요. 다른 주소로 해 볼까요?" : "메일함을 확인해 주세요. 링크를 누르면 연결돼요.");
  }

  return (
    <section className="mt-auto flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-4">
      <p className="text-sm">
        지금은 이 휴대폰에만 기억이 있어요. 계정을 연결하면 휴대폰을 바꿔도 그대로 볼 수 있어요.
      </p>
      <Button variant="accent" onClick={kakao}>
        카카오로 연결하기
      </Button>
      <form onSubmit={linkEmail} className="flex gap-2">
        <label className="sr-only" htmlFor="email">
          이메일
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일로 연결"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-text"
        />
        <Button type="submit" variant="secondary" className="px-4">
          보내기
        </Button>
      </form>
      {note && <p className="text-sm text-text-muted">{note}</p>}
      <ButtonLink href="/me/login" variant="ghost">
        이미 계정이 있어요
      </ButtonLink>
    </section>
  );
}
