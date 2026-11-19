"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { Orb } from "@/components/Orb";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import type { EmotionId } from "@/lib/emotions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { stampDate, type Memory, type Place } from "@/lib/types";
import { OperatorGate } from "../../OperatorGate";
import { useOperator } from "../../useOperator";

type Stats = { visitors: number; entries: number; memories: number; hidden: number; open_reports: number };

export function PlaceAdmin({ id }: { id: string }) {
  const { state, recheck } = useOperator();
  const [place, setPlace] = useState<Place | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [qr, setQr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    const [{ data: p }, { data: s }, { data: m }] = await Promise.all([
      supabase.from("places").select("*").eq("id", id).maybeSingle(),
      supabase.rpc("place_stats", { place: id }),
      supabase.from("memories").select("*").eq("place_id", id).order("created_at", { ascending: false }).limit(200),
    ]);
    setPlace(p);
    setStats(s?.[0] ?? null);
    setMemories(m ?? []);
    if (p) {
      const url = `${window.location.origin}/p/${p.slug}`;
      setQr(await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" }));
    }
  }, [id]);

  useEffect(() => {
    if (state !== "operator") return;
    // 운영자 확인 뒤 한 번 불러온다 (비동기 결과로만 상태를 바꾼다)
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [state, load]);

  if (state === "loading") return <PageShell>{null}</PageShell>;
  if (state === "visitor")
    return (
      <PageShell className="pt-6">
        <OperatorGate onDone={recheck} />
      </PageShell>
    );
  if (!place) return <PageShell back={{ href: "/admin", label: "장소" }}>{null}</PageShell>;

  async function setStatus(status: Place["status"]) {
    await supabaseBrowser().from("places").update({ status }).eq("id", id);
    load();
  }
  async function setMemoryStatus(memoryId: string, status: Memory["status"]) {
    await supabaseBrowser().rpc("set_memory_status", { memory: memoryId, new_status: status });
    load();
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${place.slug}` : "";
  const flagged = memories.filter((m) => m.status === "hidden" || m.report_count > 0);

  return (
    <PageShell back={{ href: "/admin", label: "장소" }} className="gap-8 pt-2">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl">{place.name}</h1>
        <p className="font-date text-xs text-text-muted">{url}</p>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center" aria-label="참여 수">
        {[
          ["다녀간 사람", stats?.visitors],
          ["남긴 마음", stats?.memories],
          ["확인할 신고", stats?.open_reports],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[var(--radius-md)] border border-border bg-surface p-3">
            <p className="font-date text-2xl">{value ?? "–"}</p>
            <p className="text-xs text-text-muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">운영 상태</h2>
        <div className="flex gap-2">
          {(
            [
              ["draft", "준비 중"],
              ["open", "운영 중"],
              ["closed", "종료"],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={place.status === s}
              className={`flex-1 rounded-full border px-3 py-2 text-sm ${place.status === s ? "border-text bg-surface" : "border-border text-text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">준비 중에는 방문객에게 보이지 않고, 종료하면 보기만 할 수 있어요.</p>
      </section>

      <PlaceLocationField key={`${place.lat}:${place.lng}:${place.radius_m}:${place.presence_required}`} place={place} onSaved={load} />

      {qr && (
        <section className="flex flex-col items-center gap-3">
          <h2 className="self-start text-lg">QR</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
          <img src={qr} alt={`${place.name} QR`} className="w-56 rounded-[var(--radius-md)] bg-surface p-2" />
          <a href={qr} download={`giok-walk-${place.slug}.png`} className="text-sm underline underline-offset-4">
            인쇄용 이미지 내려받기
          </a>
          <AnchorSizeField place={place} onSaved={load} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">신고·숨김 ({flagged.length})</h2>
        {flagged.length === 0 && <p className="text-sm text-text-muted">확인할 마음이 없어요.</p>}
        {flagged.map((m) => (
          <MemoryRow key={m.id} m={m}>
            {m.status === "hidden" ? (
              <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setMemoryStatus(m.id, "visible")}>
                다시 보이기
              </Button>
            ) : (
              <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setMemoryStatus(m.id, "hidden")}>
                숨기기
              </Button>
            )}
          </MemoryRow>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">모든 마음 ({memories.length})</h2>
        {memories.map((m) => (
          <MemoryRow key={m.id} m={m}>
            {m.status === "visible" && (
              <Button variant="ghost" className="min-h-9 px-2 text-xs" onClick={() => setMemoryStatus(m.id, "hidden")}>
                숨기기
              </Button>
            )}
          </MemoryRow>
        ))}
      </section>
    </PageShell>
  );
}

function MemoryRow({ m, children }: { m: Memory; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm">
      <Orb emotion={m.emotion as EmotionId} size={24} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2">{m.letter}</span>
        <span className="font-date text-xs text-text-muted">
          {stampDate(m.created_at)} · {m.visibility === "public" ? "모두" : m.visibility === "link" ? "링크" : "나만"}
          {m.report_count > 0 && ` · 신고 ${m.report_count}`}
          {m.status === "hidden" && " · 숨김"}
        </span>
      </span>
      {children}
    </div>
  );
}

/** 인쇄한 QR 크기: 카메라가 포스터까지 거리를 가늠하는 기준 (decisions 3-A) */
function AnchorSizeField({ place, onSaved }: { place: Place; onSaved: () => void }) {
  const [cm, setCm] = useState(String(Math.round(place.anchor_size_m * 100)));
  const [note, setNote] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(cm) / 100;
    if (!(value >= 0.05 && value <= 2)) return setNote("5~200cm 사이로 넣어 주세요.");
    const { error } = await supabaseBrowser().from("places").update({ anchor_size_m: value }).eq("id", place.id);
    setNote(error ? "저장하지 못했어요." : "저장했어요.");
    if (!error) onSaved();
  }
  return (
    <form onSubmit={save} className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-surface-sunken p-4 text-sm">
      <label className="flex items-center justify-between gap-3">
        <span>
          인쇄한 QR 한 변 길이
          <span className="block text-xs text-text-muted">구슬이 포스터 둘레 제자리에 뜨도록 실제 크기를 적어 주세요</span>
        </span>
        <span className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={cm}
            onChange={(e) => setCm(e.target.value.replace(/[^0-9]/g, ""))}
            className="min-h-10 w-16 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-right font-date"
            aria-label="QR 한 변 길이(cm)"
          />
          cm
        </span>
      </label>
      <Button type="submit" variant="secondary" className="min-h-10 text-sm">
        저장
      </Button>
      {note && <p className="text-xs text-text-muted">{note}</p>}
    </form>
  );
}

/**
 * 장소 위치·반경 (decisions 3-B)
 * 방문객 휴대폰이 이 좌표와 자기 위치를 비교해 반경 안이면 "마음 남기기"를 연다.
 */
function PlaceLocationField({ place, onSaved }: { place: Place; onSaved: () => void }) {
  const [lat, setLat] = useState(place.lat?.toString() ?? "");
  const [lng, setLng] = useState(place.lng?.toString() ?? "");
  const [radius, setRadius] = useState(String(place.radius_m));
  const [presence, setPresence] = useState(place.presence_required);
  const [note, setNote] = useState<string | null>(null);

  function useHere() {
    if (!("geolocation" in navigator)) return setNote("이 기기에서는 위치를 쓸 수 없어요.");
    setNote("지금 위치를 확인하는 중…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setNote(`지금 위치로 채웠어요 (오차 약 ${Math.round(p.coords.accuracy)}m). 저장을 눌러 주세요.`);
      },
      () => setNote("위치를 확인하지 못했어요. 직접 입력해 주세요."),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const la = lat === "" ? null : Number(lat);
    const ln = lng === "" ? null : Number(lng);
    const r = Number(radius);
    if ((la == null) !== (ln == null) || (la != null && (Math.abs(la) > 90 || Math.abs(ln!) > 180 || Number.isNaN(la) || Number.isNaN(ln!))))
      return setNote("위도·경도를 확인해 주세요.");
    if (!(r >= 20 && r <= 2000)) return setNote("반경은 20~2000m 사이로 넣어 주세요.");
    const { error } = await supabaseBrowser()
      .from("places")
      .update({ lat: la, lng: ln, radius_m: r, presence_required: presence })
      .eq("id", place.id);
    setNote(error ? "저장하지 못했어요." : "저장했어요.");
    if (!error) onSaved();
  }

  const field = "min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 font-date";
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg">장소 위치</h2>
      <form onSubmit={save} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-4 text-sm">
        <Button type="button" variant="secondary" className="min-h-10 text-sm" onClick={useHere}>
          지금 내 위치를 이 장소로
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            위도
            <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className={field} aria-label="위도" />
          </label>
          <label className="flex flex-col gap-1">
            경도
            <input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className={field} aria-label="경도" />
          </label>
        </div>
        <label className="flex items-center justify-between gap-3">
          남길 수 있는 반경
          <span className="flex items-center gap-1">
            <input
              inputMode="numeric"
              value={radius}
              onChange={(e) => setRadius(e.target.value.replace(/[^0-9]/g, ""))}
              className="min-h-10 w-20 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-right font-date"
              aria-label="반경(m)"
            />
            m
          </span>
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            현장에서만 남기기
            <span className="block text-xs text-text-muted">끄면 어디서나 남길 수 있어요 (시연·온라인 행사용)</span>
          </span>
          <input type="checkbox" checked={presence} onChange={(e) => setPresence(e.target.checked)} className="size-5" />
        </label>
        <Button type="submit" className="min-h-10 text-sm">
          저장
        </Button>
        {note && <p className="text-xs text-text-muted">{note}</p>}
      </form>
    </section>
  );
}
