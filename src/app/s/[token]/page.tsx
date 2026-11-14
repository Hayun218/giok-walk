import type { Metadata } from "next";
import { LetterCard } from "@/components/LetterCard";
import { ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import type { EmotionId } from "@/lib/emotions";
import { supabaseAdmin, supabasePublic } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(token: string) {
  if (!UUID.test(token)) return null;
  const { data } = await supabasePublic().rpc("get_shared_memory", { token });
  const memory = data?.[0];
  if (!memory) return null;
  let photoUrl: string | null = null;
  if (memory.photo_path) {
    // 사진은 비공개 저장소에 있다. 링크를 연 사람에게만 짧게 열리는 주소를 만든다.
    const { data: signed } = await supabaseAdmin().storage.from("memory-photos").createSignedUrl(memory.photo_path, 3600);
    photoUrl = signed?.signedUrl ?? null;
  }
  return { memory, photoUrl };
}

export async function generateMetadata(props: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await props.params;
  const found = await load(token);
  return found
    ? { title: `${found.memory.place_name}에 남긴 마음`, description: "누군가 이 자리에 마음을 두고 갔어요." }
    : { title: "열 수 없는 마음" };
}

/** 공유 링크로 연 엽서 (로그인 없이 볼 수 있다) */
export default async function SharedPage(props: PageProps<"/s/[token]">) {
  const { token } = await props.params;
  const found = await load(token);

  if (!found) {
    return (
      <PageShell className="items-center justify-center gap-4 text-center text-text-muted">
        <p>이 마음은 더 이상 열 수 없어요.</p>
        <ButtonLink href="/" variant="secondary">
          기억산책 둘러보기
        </ButtonLink>
      </PageShell>
    );
  }
  const { memory, photoUrl } = found;
  return (
    <PageShell className="gap-6 pt-2">
      <p className="text-center text-sm text-text-muted">누군가 {memory.place_name}에 마음을 두고 갔어요</p>
      <LetterCard
        emotion={memory.emotion as EmotionId}
        recipient={memory.recipient}
        letter={memory.letter}
        placeName={memory.place_name}
        createdAt={memory.created_at}
        photoUrl={photoUrl}
      />
      <div className="flex flex-col gap-2">
        <ButtonLink href={`/p/${memory.place_slug}`}>{memory.place_name}에 가 보기</ButtonLink>
        <p className="text-center text-sm text-text-muted">그곳에 가면 나도 마음을 남길 수 있어요.</p>
      </div>
    </PageShell>
  );
}
