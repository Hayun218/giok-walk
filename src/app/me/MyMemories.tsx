"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Orb } from "@/components/Orb";
import { SignupCard } from "@/components/SignupCard";
import { ThemeSetting } from "@/components/ThemeSetting";
import { Button } from "@/components/ui/Button";
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
        {ready && <AccountBox />}
        <ThemeSetting />
      </div>
    </PageShell>
  );
}

/** 가입·로그인 상태 (decisions 2-7, 2-10) */
function AccountBox() {
  const { user } = useCurrentUser();
  const [justJoined, setJustJoined] = useState(false);

  if (!user) return null;

  if (user.is_anonymous || justJoined) {
    return (
      <div className="flex flex-col gap-4">
        <SignupCard context="me" onDone={() => setJustJoined(true)} />
        <Suspense fallback={null}>
          <MovedNote />
        </Suspense>
      </div>
    );
  }

  const via = user.app_metadata?.provider === "kakao" ? "카카오" : user.email ?? "계정";
  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-surface-sunken p-4 text-sm">
      <Suspense fallback={null}>
        <MovedNote />
      </Suspense>
      <p>{via}로 가입되어 있어요. 어느 휴대폰에서든 내 엽서를 볼 수 있어요.</p>
      <Button variant="ghost" onClick={() => supabaseBrowser().auth.signOut().then(() => location.reload())}>
        이 휴대폰에서 로그아웃
      </Button>
    </section>
  );
}

/** 로그인하면서 옮겨 온 마음 수 */
function MovedNote() {
  const moved = Number(useSearchParams().get("moved") ?? 0);
  if (!moved) return null;
  return (
    <p className="rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm" role="status">
      이 휴대폰에서 남긴 마음 {moved}개를 내 계정으로 옮겼어요.
    </p>
  );
}
