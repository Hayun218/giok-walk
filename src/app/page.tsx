import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { brand } from "@/config/brand";
import { EMOTIONS } from "@/lib/emotions";

const STEPS = [
  { title: "QR로 열어요", body: "행사장이나 장소에 있는 QR을 찍으면 바로 열려요. 따로 설치하지 않아요." },
  { title: "마음을 남겨요", body: "오늘 마음의 색을 고르고 짧은 편지를 써서, 카메라로 비춘 그 자리에 두어요." },
  { title: "다시 와서 만나요", body: "남긴 마음은 그 자리에 계속 쌓여요. 다시 찾아오면 그대로 있어요." },
];

const MODES = [
  { title: "행사와 함께", body: "축제·정기 행사장에 QR을 두고 방문객의 마음을 모아요." },
  { title: "장소와 함께", body: "카페·전시·관광지와 함께 그곳만의 기억 자리를 만들어요." },
  { title: "나의 기록", body: "내가 다녀간 곳마다 남긴 마음을 모아 봐요." },
];

/** 소개 화면 (컨설팅·랜딩용). 방문객은 보통 QR 로 /p/{장소} 에 바로 들어온다. */
export default function Home() {
  return (
    <PageShell className="gap-12 pt-6 pb-6">
      <section className="flex flex-col gap-5">
        <div className="flex gap-2" aria-hidden>
          {EMOTIONS.map((e, i) => (
            <span key={e.id} className="animate-[float_4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.5}s` }}>
              <Orb emotion={e.id} size={28} />
            </span>
          ))}
        </div>
        <h1 className="text-2xl">{brand.tagline}</h1>
        <p className="text-text-muted">
          {brand.name}은 장소에 마음을 남기는 서비스예요. 편지와 마음의 색이 구슬이 되어 그 자리에 남고, 다시 찾아오면 그대로 만날 수 있어요.
        </p>
        <ButtonLink href="/p/demo">영일대 산책길에서 해 보기</ButtonLink>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">이렇게 써요</h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="shrink-0 font-date text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-1">
                <span className="font-medium">{s.title}</span>
                <span className="text-sm text-text-muted">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">어디서 만나나요</h2>
        <ul className="grid gap-3">
          {MODES.map((m) => (
            <li key={m.title} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <p className="font-medium">{m.title}</p>
              <p className="text-sm text-text-muted">{m.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto flex justify-between text-sm text-text-muted">
        <a href="/me">내 기억</a>
        <a href="/admin">운영자</a>
      </footer>
    </PageShell>
  );
}
