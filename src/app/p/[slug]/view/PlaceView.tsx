"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MemorySheet } from "@/components/MemorySheet";
import { Orb } from "@/components/Orb";
import { CameraConsent } from "@/components/scene/CameraConsent";
import { useCamera } from "@/components/scene/useCamera";
import { sceneChip } from "@/components/scene/chip";
import { ButtonLink } from "@/components/ui/Button";
import { anchorSlot } from "@/lib/anchor";
import { emotionLabel, type EmotionId } from "@/lib/emotions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { recipientLabel, stampDate, type Memory, type Place } from "@/lib/types";
import { ensureVisitor, logActivity } from "@/lib/visitor";

const PlaceScene = dynamic(() => import("@/components/scene/PlaceScene"), { ssr: false });

type Tab = "around" | "list";

export function PlaceView({ place }: { place: Place }) {
  const [tab, setTab] = useState<Tab>("around");
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);
  const camera = useCamera();

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await ensureVisitor();
      logActivity(place.id, "view");
      // RLS: 모두에게 공개된 것 + 내가 남긴 것(나만·링크·숨김 포함)
      const { data } = await supabaseBrowser()
        .from("memories")
        .select("*")
        .eq("place_id", place.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (!alive) return;
      setUserId(user.id);
      setMemories(data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [place.id]);

  const mineCount = useMemo(() => memories?.filter((m) => m.author_id === userId).length ?? 0, [memories, userId]);
  const sceneMemories = useMemo(
    () =>
      (memories ?? []).map((m, i) => ({
        id: m.id,
        emotion: m.emotion as EmotionId,
        // 포스터 기준 자리 (서버가 배정). 혹시 없으면 순서대로 자리를 만든다
        anchor:
          m.anchor_x != null && m.anchor_y != null && m.anchor_z != null
            ? { x: m.anchor_x, y: m.anchor_y, z: m.anchor_z }
            : anchorSlot(m.anchor_slot ?? i),
        mine: m.author_id === userId,
      })),
    [memories, userId],
  );

  const tabs = (
    <div
      role="tablist"
      aria-label="보기 방식"
      className={`flex rounded-full p-1 text-sm ${
        tab === "around"
          ? "bg-scene-chip backdrop-blur-md"
          : "bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)]"
      }`}
    >
      {(
        [
          ["around", "둘러보기"],
          ["list", "모아보기"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={`flex-1 rounded-full px-4 py-2 ${tab === id ? "bg-surface text-text shadow-[var(--shadow-card)]" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const summary =
    memories === null
      ? "불러오는 중…"
      : `마음 ${memories.length}개${mineCount ? ` · 내가 남긴 마음 ${mineCount}개` : ""}`;

  if (tab === "around") {
    const ready = camera.choice !== "undecided";
    return (
      <div className="fixed inset-0 flex flex-col bg-scene-bg text-on-scene">
        {ready && memories && (
          <PlaceScene
            memories={sceneMemories}
            objectKind={place.object_kind}
            mode="view"
            cameraStream={camera.choice === "camera" ? camera.stream : null}
            placeSlug={place.slug}
            placeName={place.name}
            anchorSize={place.anchor_size_m}
            onSelect={(id) => setSelected(memories?.find((m) => m.id === id) ?? null)}
            onUsePicture={camera.usePicture}
          />
        )}
        <div className="relative z-10 flex flex-col gap-3 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="flex items-center justify-between text-sm">
            <Link href={`/p/${place.slug}`} className={sceneChip}>
              ← {place.name}
            </Link>
            <span data-testid="view-summary" className={sceneChip}>
              {summary}
            </span>
          </div>
          {tabs}
        </div>
        {ready && (
          <p className={`relative z-10 mx-5 mt-auto mb-[max(env(safe-area-inset-bottom),1.5rem)] self-center text-center text-sm ${sceneChip}`}>
            {camera.choice === "camera" ? "포스터 둘레를 천천히 둘러보세요. 구슬을 누르면 편지가 열려요." : "화면을 끌어서 둘러보세요. 구슬을 누르면 편지가 열려요."}
          </p>
        )}
        <CameraConsent open={!ready} purpose="view" onCamera={camera.start} onPicture={camera.usePicture} />
        <MemorySheet
          memory={selected}
          placeName={place.name}
          mine={!!selected && selected.author_id === userId}
          onClose={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--page-max-width)] flex-1 flex-col gap-5 px-[var(--page-gutter)] pt-4 pb-10">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <Link href={`/p/${place.slug}`}>← {place.name}</Link>
        <span data-testid="view-summary">{summary}</span>
      </div>
      {tabs}
      {memories?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center text-text-muted">
          <Orb size={40} />
          <p>아직 남겨진 마음이 없어요.</p>
          {place.status === "open" && <ButtonLink href={`/p/${place.slug}/write`}>첫 마음 남기기</ButtonLink>}
        </div>
      )}
      <ul className="flex flex-col gap-3" aria-label="남겨진 마음">
        {memories?.map((m) => {
          const mine = m.author_id === userId;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="flex w-full items-start gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-left"
              >
                <Orb emotion={m.emotion as EmotionId} size={36} className="mt-1 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {emotionLabel(m.emotion as EmotionId)} · {recipientLabel(m.recipient)}
                    {mine && <span className="rounded-full bg-surface-sunken px-2 py-0.5">내가 남긴 마음</span>}
                    {mine && m.visibility !== "public" && (
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5">{m.visibility === "private" ? "나만" : "링크"}</span>
                    )}
                  </span>
                  <span className="line-clamp-2 font-title">{m.letter}</span>
                  <span className="font-date text-xs tracking-[var(--tracking-date)] text-text-muted">{stampDate(m.created_at)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {place.status === "open" && memories && memories.length > 0 && (
        <ButtonLink href={`/p/${place.slug}/write`} className="sticky bottom-4 mt-auto">
          나도 마음 남기기
        </ButtonLink>
      )}
      <MemorySheet
        memory={selected}
        placeName={place.name}
        mine={!!selected && selected.author_id === userId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
