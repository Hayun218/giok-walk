import { Stamp } from "@/components/Stamp";
import type { EmotionId } from "@/lib/emotions";
import { recipientLabel, stampDate, type Recipient } from "@/lib/types";

/** 엽서 카드 = 오브젝트를 열면 보이는 편지 (decisions 1-5) */
export function LetterCard({
  emotion,
  recipient,
  letter,
  placeName,
  createdAt,
  photoUrl,
  mine = false,
}: {
  emotion: EmotionId;
  recipient: Recipient;
  letter: string;
  placeName: string;
  createdAt: string;
  photoUrl?: string | null;
  mine?: boolean;
}) {
  const date = stampDate(createdAt);
  return (
    <article className="relative flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-text shadow-[var(--shadow-card)]">
      <p className="text-sm text-text-muted">
        {recipientLabel(recipient)}
        {mine && <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 text-xs">내가 남긴 마음</span>}
      </p>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- 서명 URL 이라 next/image 최적화 대상이 아님
        <img src={photoUrl} alt="함께 남긴 사진" className="max-h-72 w-full rounded-[var(--radius-md)] object-cover" />
      )}
      <p className="whitespace-pre-wrap font-title text-lg leading-[1.8]">{letter}</p>
      <div className="mt-2 flex items-end justify-between border-t border-border pt-4">
        <p className="font-date text-xs tracking-[var(--tracking-date)] text-text-muted">
          {date} · {placeName}
        </p>
        <Stamp place={placeName} date={date} emotion={emotion} size={72} />
      </div>
    </article>
  );
}
