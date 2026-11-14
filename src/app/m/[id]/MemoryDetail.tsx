"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LetterCard } from "@/components/LetterCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import type { EmotionId } from "@/lib/emotions";
import { shareMemory } from "@/lib/share";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError, VISIBILITIES, type Memory, type Visibility } from "@/lib/types";
import { useCurrentUser } from "@/lib/visitor";

type Row = Memory & { places: { name: string; slug: string } | null };

export function MemoryDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, ready } = useCurrentUser();
  const [memory, setMemory] = useState<Row | null | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const supabase = supabaseBrowser();
    supabase
      .from("memories")
      .select("*, places(name, slug)")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        setMemory(data as Row | null);
        if (data?.photo_path) {
          const { data: signed } = await supabase.storage.from("memory-photos").createSignedUrl(data.photo_path, 600);
          setPhotoUrl(signed?.signedUrl ?? null);
        }
      });
  }, [id, ready]);

  if (memory === undefined) return <PageShell>{null}</PageShell>;
  if (memory === null)
    return (
      <PageShell className="items-center justify-center gap-4 text-center text-text-muted">
        <p>이 마음을 찾을 수 없어요.</p>
        <ButtonLink href="/me" variant="secondary">
          내 기억으로
        </ButtonLink>
      </PageShell>
    );

  const mine = memory.author_id === user?.id;
  const placeName = memory.places?.name ?? "";

  async function changeVisibility(v: Visibility) {
    if (!memory) return;
    const patch = v === "public" ? { visibility: v, photo_path: null } : { visibility: v };
    if (v === "public" && memory.photo_path && !window.confirm("모두에게 보이는 마음에는 사진을 붙일 수 없어요. 사진을 빼고 바꿀까요?")) return;
    const { error } = await supabaseBrowser().from("memories").update(patch).eq("id", memory.id);
    if (error) return setNote(friendlyError(error.message));
    setMemory({ ...memory, ...patch });
    if (v === "public") setPhotoUrl(null);
    setNote("바꿨어요.");
  }

  async function remove() {
    if (!memory || !window.confirm("이 마음을 지울까요? 지우면 되돌릴 수 없어요.")) return;
    const supabase = supabaseBrowser();
    if (memory.photo_path) await supabase.storage.from("memory-photos").remove([memory.photo_path]);
    const { error } = await supabase.from("memories").delete().eq("id", memory.id);
    if (error) return setNote(friendlyError(error.message));
    router.push("/me");
  }

  return (
    <PageShell back={{ href: "/me", label: "내 기억" }} className="gap-6 pt-2">
      <LetterCard
        emotion={memory.emotion as EmotionId}
        recipient={memory.recipient}
        letter={memory.letter}
        placeName={placeName}
        createdAt={memory.created_at}
        photoUrl={photoUrl}
        mine={mine}
      />
      {mine && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-md">누가 볼 수 있나요</h2>
            <div className="flex gap-2" role="radiogroup" aria-label="보는 사람">
              {VISIBILITIES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={memory.visibility === v.id}
                  onClick={() => changeVisibility(v.id)}
                  className={`flex-1 rounded-full border px-3 py-2 text-sm ${memory.visibility === v.id ? "border-text bg-surface" : "border-border text-text-muted"}`}
                >
                  {v.id === "public" ? "모두" : v.id === "link" ? "링크" : "나만"}
                </button>
              ))}
            </div>
          </section>
          <div className="flex flex-col gap-2">
            {memory.visibility !== "private" && (
              <Button
                onClick={async () => {
                  const r = await shareMemory(memory.share_token, placeName);
                  if (r === "copied") setNote("링크를 복사했어요.");
                }}
              >
                엽서 보내기
              </Button>
            )}
            {memory.places && (
              <ButtonLink href={`/p/${memory.places.slug}/view`} variant="secondary">
                이 장소의 마음들 보기
              </ButtonLink>
            )}
            <Button variant="ghost" onClick={remove}>
              이 마음 지우기
            </Button>
          </div>
        </>
      )}
      {note && <p className="text-center text-sm text-text-muted">{note}</p>}
    </PageShell>
  );
}
