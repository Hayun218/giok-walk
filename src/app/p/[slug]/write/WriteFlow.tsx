"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { EmotionPicker } from "@/components/EmotionPicker";
import { LetterCard } from "@/components/LetterCard";
import { Orb } from "@/components/Orb";
import { CameraConsent } from "@/components/scene/CameraConsent";
import { sceneChip } from "@/components/scene/chip";
import type { Aim } from "@/components/scene/PlaceScene";
import { useCamera } from "@/components/scene/useCamera";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import type { EmotionId } from "@/lib/emotions";
import { preparePhoto } from "@/lib/image";
import { pickDistance } from "@/lib/placement";
import { shareMemory } from "@/lib/share";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  friendlyError,
  LETTER_MAX,
  RECIPIENTS,
  VISIBILITIES,
  type Place,
  type Recipient,
  type Visibility,
} from "@/lib/types";
import { ensureVisitor, logActivity } from "@/lib/visitor";

const PlaceScene = dynamic(() => import("@/components/scene/PlaceScene"), { ssr: false });

type Step = "color" | "recipient" | "letter" | "visibility" | "place" | "done";
const FORM_STEPS: Step[] = ["color", "recipient", "letter", "visibility"];

export function WriteFlow({ place }: { place: Place }) {
  const [step, setStep] = useState<Step>("color");
  const [emotion, setEmotion] = useState<EmotionId | null>(null);
  const [recipient, setRecipient] = useState<Recipient>("stranger");
  const [letter, setLetter] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; shareToken: string; createdAt: string; visibility: Visibility } | null>(
    null,
  );
  const [shareNote, setShareNote] = useState<string | null>(null);
  const camera = useCamera();
  const aimRef = useRef<(() => Aim) | null>(null);

  const stepIndex = FORM_STEPS.indexOf(step);
  const back = () => setStep(FORM_STEPS[Math.max(0, stepIndex - 1)]);
  const next = () => setStep(FORM_STEPS[stepIndex + 1] ?? "place");

  async function save() {
    if (!emotion) return;
    setSaving(true);
    setError(null);
    try {
      const user = await ensureVisitor();
      const supabase = supabaseBrowser();
      const id = crypto.randomUUID();
      const aim = aimRef.current?.() ?? { yaw: Math.random() * 360, pitch: 5 };

      let photoPath: string | null = null;
      if (photo && visibility !== "public") {
        const blob = await preparePhoto(photo);
        photoPath = `${user.id}/${id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("memory-photos")
          .upload(photoPath, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
      }

      const { data, error: insErr } = await supabase
        .from("memories")
        .insert({
          id,
          place_id: place.id,
          author_id: user.id,
          emotion,
          recipient,
          letter: letter.trim(),
          visibility,
          photo_path: photoPath,
          yaw: aim.yaw,
          pitch: aim.pitch,
          distance: pickDistance(),
        })
        .select("id, share_token, created_at, visibility")
        .single();
      if (insErr) throw insErr;
      logActivity(place.id, "create");
      setSaved({ id: data.id, shareToken: data.share_token, createdAt: data.created_at, visibility: data.visibility });
      setStep("done");
    } catch (e) {
      setError(friendlyError((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    if (!saved) return;
    let current = saved;
    if (current.visibility === "private") {
      // 나만 보기를 보내려면 링크로 열 수 있게 바꾼다
      const ok = window.confirm("나만 보는 마음이에요. 링크를 받은 사람도 볼 수 있게 바꿀까요?");
      if (!ok) return;
      const { error: upErr } = await supabaseBrowser().from("memories").update({ visibility: "link" }).eq("id", current.id);
      if (upErr) return setShareNote(friendlyError(upErr.message));
      current = { ...current, visibility: "link" };
      setSaved(current);
    }
    const result = await shareMemory(current.shareToken, place.name);
    if (result !== "failed") logActivity(place.id, "share");
    setShareNote(result === "copied" ? "링크를 복사했어요. 보내고 싶은 곳에 붙여 넣어 주세요." : null);
  }

  // ── 남기기: 카메라(또는 그림) 위에 놓기 ───────────
  if (step === "place" && emotion) {
    const ready = camera.choice !== "undecided";
    return (
      <div className="fixed inset-0 flex flex-col bg-scene-bg text-on-scene">
        {ready && (
          <PlaceScene
            memories={[]}
            objectKind={place.object_kind}
            mode="place"
            ghostEmotion={emotion}
            cameraStream={camera.stream}
            aimRef={aimRef}
          />
        )}
        <div className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <button type="button" onClick={() => setStep("visibility")} className={`text-sm ${sceneChip}`}>
            ← 돌아가기
          </button>
        </div>
        <div className="relative z-10 mt-auto flex flex-col gap-3 px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          {ready && (
            <p className={`self-center text-center text-sm ${sceneChip}`}>
              {camera.choice === "camera" ? "마음을 두고 싶은 곳을 비춰 주세요" : "화면을 끌어서 둘 곳을 골라 주세요"}
              {camera.denied && " (카메라를 쓸 수 없어서 그림 위에 둘게요)"}
            </p>
          )}
          {error && <p className="rounded-[var(--radius-md)] bg-surface p-3 text-center text-sm text-danger">{error}</p>}
          <Button variant="accent" onClick={save} disabled={!ready || saving}>
            {saving ? "두는 중…" : "이 자리에 두기"}
          </Button>
        </div>
        <CameraConsent open={!ready} purpose="place" onCamera={camera.start} onPicture={camera.usePicture} />
      </div>
    );
  }

  // ── 다 남겼어요 ───────────────────────────────
  if (step === "done" && saved && emotion) {
    return (
      <PageShell className="gap-6 pt-4">
        <div className="flex flex-col items-center gap-3 pt-2 text-center animate-[rise_var(--duration-slow)_var(--ease-soft)]">
          <Orb emotion={emotion} size={56} />
          <h1 className="text-xl">이 자리에 마음을 두었어요</h1>
          <p className="text-sm text-text-muted">다시 찾아오면 그대로 남아 있을 거예요.</p>
        </div>
        <LetterCard
          emotion={emotion}
          recipient={recipient}
          letter={letter.trim()}
          placeName={place.name}
          createdAt={saved.createdAt}
          photoUrl={photo ? URL.createObjectURL(photo) : null}
          mine
        />
        <div className="flex flex-col gap-3">
          <ButtonLink href={`/p/${place.slug}/view`}>남겨진 마음 보러 가기</ButtonLink>
          <Button variant="secondary" onClick={share}>
            엽서 보내기
          </Button>
          {shareNote && <p className="text-center text-sm text-text-muted">{shareNote}</p>}
          <Link href="/me" className="py-2 text-center text-sm text-text-muted underline-offset-4 hover:underline">
            내 기억 모아 보기
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── 쓰기 단계 ─────────────────────────────────
  return (
    <PageShell back={stepIndex === 0 ? { href: `/p/${place.slug}`, label: place.name } : undefined} className="gap-6 pt-2">
      {stepIndex > 0 && (
        <button type="button" onClick={back} className="-my-2 self-start py-2 text-sm text-text-muted">
          ← 이전
        </button>
      )}
      <ol className="flex gap-1.5" aria-label={`${stepIndex + 1} / ${FORM_STEPS.length} 단계`}>
        {FORM_STEPS.map((s, i) => (
          <li key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-text" : "bg-border"}`} />
        ))}
      </ol>

      {step === "color" && (
        <>
          <h1 className="text-xl">오늘 마음은 어떤 색인가요?</h1>
          <EmotionPicker value={emotion} onChange={setEmotion} />
          <Button className="mt-auto" disabled={!emotion} onClick={next}>
            다음
          </Button>
        </>
      )}

      {step === "recipient" && (
        <>
          <h1 className="text-xl">누구에게 남길까요?</h1>
          <div role="radiogroup" aria-label="받는 사람" className="flex flex-col gap-2">
            {RECIPIENTS.map((r) => (
              <Choice key={r.id} selected={recipient === r.id} onSelect={() => setRecipient(r.id)} label={r.label} hint={r.hint} />
            ))}
          </div>
          <Button className="mt-auto" onClick={next}>
            다음
          </Button>
        </>
      )}

      {step === "letter" && (
        <>
          <h1 className="text-xl">{RECIPIENTS.find((r) => r.id === recipient)?.label}</h1>
          {place.prompt && (
            <p className="rounded-[var(--radius-md)] bg-surface-sunken px-4 py-3 text-sm text-text-muted">💭 {place.prompt}</p>
          )}
          <label className="flex flex-col gap-2">
            <span className="sr-only">편지</span>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value.slice(0, LETTER_MAX))}
              rows={6}
              placeholder="짧아도 괜찮아요."
              className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-surface p-4 font-title text-lg leading-[1.8] outline-none focus:border-text"
            />
            <span className="self-end font-date text-xs text-text-muted">
              {letter.length} / {LETTER_MAX}
            </span>
          </label>
          <Button className="mt-auto" disabled={letter.trim().length === 0} onClick={next}>
            다음
          </Button>
        </>
      )}

      {step === "visibility" && (
        <>
          <h1 className="text-xl">누가 볼 수 있을까요?</h1>
          <div role="radiogroup" aria-label="보는 사람" className="flex flex-col gap-2">
            {VISIBILITIES.map((v) => (
              <Choice
                key={v.id}
                selected={visibility === v.id}
                onSelect={() => {
                  setVisibility(v.id);
                  if (v.id === "public") setPhoto(null);
                }}
                label={v.label}
                hint={v.hint}
              />
            ))}
          </div>
          {visibility !== "public" ? (
            <label className="flex cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] border border-dashed border-border p-4 text-sm">
              <span className="font-medium">사진도 한 장 담을까요? (골라도 되고 안 골라도 돼요)</span>
              <span className="text-text-muted">
                {photo ? `${photo.name} · 바꾸려면 다시 눌러 주세요` : "사진은 이 편지를 여는 사람만 볼 수 있어요."}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <p className="text-sm text-text-muted">모두에게 보이는 마음은 글로만 남겨요.</p>
          )}
          <Button className="mt-auto" onClick={next}>
            이 자리에 두러 가기
          </Button>
        </>
      )}
    </PageShell>
  );
}

function Choice({ selected, onSelect, label, hint }: { selected: boolean; onSelect: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col items-start gap-0.5 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors duration-[var(--duration-fast)] ${
        selected ? "border-text bg-surface" : "border-border"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-sm text-text-muted">{hint}</span>
    </button>
  );
}
