"use client";

import { useEffect, useState } from "react";
import { LetterCard } from "@/components/LetterCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { EmotionId } from "@/lib/emotions";
import { shareMemory } from "@/lib/share";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Memory } from "@/lib/types";
import { logActivity } from "@/lib/visitor";

const REASONS = [
  { id: "abuse", label: "불쾌하거나 상처 주는 말" },
  { id: "spam", label: "광고·도배" },
  { id: "privacy", label: "다른 사람의 개인정보" },
  { id: "other", label: "그 밖의 이유" },
] as const;

type Props = { memory: Memory | null; placeName: string; mine: boolean; onClose: () => void };

/** 오브젝트를 눌렀을 때 열리는 편지 */
export function MemorySheet({ memory, placeName, mine, onClose }: Props) {
  return (
    <Sheet open={!!memory} onClose={onClose}>
      {memory && <Body key={memory.id} memory={memory} placeName={placeName} mine={mine} />}
    </Sheet>
  );
}

function Body({ memory, placeName, mine }: { memory: Memory; placeName: string; mine: boolean }) {
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!memory.photo_path || !mine) return;
    supabaseBrowser()
      .storage.from("memory-photos")
      .createSignedUrl(memory.photo_path, 600)
      .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null));
  }, [memory.photo_path, mine]);

  async function report(reason: (typeof REASONS)[number]["id"]) {
    const { error } = await supabaseBrowser().from("reports").insert({ memory_id: memory.id, reason });
    setReporting(false);
    setNote(error ? "이미 알려 주셨어요. 고마워요." : "알려 주셔서 고마워요. 살펴볼게요.");
  }

  async function share() {
    const result = await shareMemory(memory.share_token, placeName);
    if (result !== "failed") logActivity(memory.place_id, "share");
    if (result === "copied") setNote("링크를 복사했어요.");
  }

  return (
    <div className="flex flex-col gap-4">
      <LetterCard
        emotion={memory.emotion as EmotionId}
        recipient={memory.recipient}
        letter={memory.letter}
        placeName={placeName}
        createdAt={memory.created_at}
        photoUrl={photoUrl}
        mine={mine}
      />
      {mine && memory.status === "hidden" && (
        <p className="text-sm text-text-muted">신고가 들어와서 지금은 나에게만 보여요. 운영자가 살펴보고 있어요.</p>
      )}
      {mine ? (
        <div className="flex flex-col gap-2">
          {memory.visibility !== "private" && <Button onClick={share}>엽서 보내기</Button>}
          <ButtonLink href={`/m/${memory.id}`} variant="secondary">
            자세히 보기
          </ButtonLink>
        </div>
      ) : reporting ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">어떤 점이 불편했나요?</p>
          {REASONS.map((r) => (
            <Button key={r.id} variant="secondary" onClick={() => report(r.id)}>
              {r.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setReporting(false)}>
            그만두기
          </Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setReporting(true)}>
          이 마음 신고하기
        </Button>
      )}
      {note && <p className="text-center text-sm text-text-muted">{note}</p>}
    </div>
  );
}
