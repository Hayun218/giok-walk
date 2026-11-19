"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LocationConsent } from "@/components/LocationConsent";
import { Orb } from "@/components/Orb";
import { PageShell } from "@/components/ui/PageShell";
import { distanceM, formatDistance, isWithin, placeLatLng } from "@/lib/geo";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Place } from "@/lib/types";
import { useLocation } from "@/lib/useLocation";

type Row = Pick<Place, "id" | "slug" | "name" | "venue_name" | "lat" | "lng" | "radius_m" | "status" | "presence_required">;

/** 근처의 기억 장소 (QR 없이 찾기). 거리 계산은 휴대폰 안에서만 한다. */
export function Nearby() {
  const { state, start } = useLocation();
  const [places, setPlaces] = useState<Row[] | null>(null);

  useEffect(() => {
    // 공개된 장소 목록(좌표 포함)을 받아 휴대폰에서 거리를 잰다 — 내 위치는 보내지 않는다
    supabaseBrowser()
      .from("places")
      .select("id, slug, name, venue_name, lat, lng, radius_m, status, presence_required")
      .not("lat", "is", null)
      .then(({ data }) => setPlaces((data as Row[]) ?? []));
  }, []);

  const sorted = useMemo(() => {
    if (state.status !== "ok" || !places) return null;
    return places
      .map((p) => {
        const at = placeLatLng(p)!;
        return { ...p, distance: distanceM(state.fix, at), here: isWithin(state.fix, at, p.radius_m) };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [state, places]);

  return (
    <PageShell back={{ href: "/", label: "처음으로" }} className="gap-6 pt-2">
      <h1 className="text-2xl">근처의 기억 장소</h1>
      <LocationConsent state={state} onAllow={start} purpose="nearby" />

      {sorted && sorted.length === 0 && <p className="text-text-muted">아직 등록된 장소가 없어요.</p>}
      {sorted && (
        <ul className="flex flex-col gap-2" aria-label="가까운 장소">
          {sorted.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.slug}`}
                className={`flex items-center gap-3 rounded-[var(--radius-md)] border bg-surface p-4 ${p.here ? "border-text" : "border-border"}`}
              >
                <Orb size={28} className="shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{p.name}</span>
                  {p.venue_name && <span className="truncate text-xs text-text-muted">{p.venue_name}</span>}
                </span>
                <span className="shrink-0 text-right text-sm">
                  {p.here ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-contrast">여기 계세요</span>
                  ) : (
                    <span className="font-date text-text-muted">{formatDistance(p.distance)}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto text-center text-xs text-text-muted">장소에 있는 QR을 찍어도 바로 들어갈 수 있어요.</p>
    </PageShell>
  );
}
