"use client";

import { useEffect, useState } from "react";
import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { EMOTIONS } from "@/lib/emotions";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Place } from "@/lib/types";
import { ensureVisitor, logActivity } from "@/lib/visitor";

const DECOR = [
  { left: "8%", top: "40%", size: 44 },
  { left: "30%", top: "8%", size: 30 },
  { left: "44%", top: "48%", size: 56 },
  { left: "68%", top: "14%", size: 36 },
  { left: "80%", top: "56%", size: 40 },
  { left: "20%", top: "76%", size: 26 },
];

export function PlaceHome({ place }: { place: Place }) {
  const [counts, setCounts] = useState<{ all: number; mine: number } | null>(null);
  const open = place.status === "open";

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await ensureVisitor();
      logActivity(place.id, "enter");
      const supabase = supabaseBrowser();
      const [{ count: all }, { count: mine }] = await Promise.all([
        supabase.from("memories").select("id", { count: "exact", head: true }).eq("place_id", place.id),
        supabase
          .from("memories")
          .select("id", { count: "exact", head: true })
          .eq("place_id", place.id)
          .eq("author_id", user.id),
      ]);
      if (alive) setCounts({ all: all ?? 0, mine: mine ?? 0 });
    })().catch(() => alive && setCounts({ all: 0, mine: 0 }));
    return () => {
      alive = false;
    };
  }, [place.id]);

  return (
    <PageShell className="gap-8 pt-6">
      <section className="flex flex-col gap-3">
        {place.venue_name && <p className="text-sm text-text-muted">{place.venue_name}</p>}
        <h1 className="text-2xl">{place.name}</h1>
        {place.description && <p className="text-text-muted">{place.description}</p>}
      </section>

      <div className="relative mx-auto h-44 w-full max-w-72" aria-hidden>
        {EMOTIONS.map((e, i) => {
          const spot = DECOR[i % DECOR.length];
          return (
            <span
              key={e.id}
              className="absolute animate-[float_4s_ease-in-out_infinite]"
              style={{ left: spot.left, top: spot.top, animationDelay: `${i * 0.6}s` }}
            >
              <Orb emotion={e.id} size={spot.size} />
            </span>
          );
        })}
      </div>

      <p className="text-center text-text-muted" data-testid="place-counts">
        {counts === null
          ? " "
          : counts.mine > 0
            ? `내가 남긴 마음 ${counts.mine}개가 그대로 있어요`
            : counts.all > 0
              ? `이 자리에 마음 ${counts.all}개가 남아 있어요`
              : "아직 아무도 마음을 남기지 않았어요. 첫 마음을 남겨 볼까요?"}
      </p>

      <div className="mt-auto flex flex-col gap-3">
        {open ? (
          <ButtonLink href={`/p/${place.slug}/write`}>마음 남기기</ButtonLink>
        ) : (
          <p className="rounded-[var(--radius-md)] bg-surface-sunken p-4 text-center text-sm text-text-muted">
            지금은 마음을 남길 수 없는 때예요. 남겨진 마음은 볼 수 있어요.
          </p>
        )}
        <ButtonLink href={`/p/${place.slug}/view`} variant="secondary">
          남겨진 마음 보기
        </ButtonLink>
      </div>
    </PageShell>
  );
}
