# 기억산책 (giok-walk)

장소에 마음(편지·감정)을 오브젝트로 남기고, 다시 찾아오면 그대로 만나는 모바일 웹앱.
결정 사항과 미정 사항은 [docs/decisions.md](docs/decisions.md)에 있다.

## 처음 실행

필요한 것: Node 24, pnpm, Docker Desktop(로컬 DB), Supabase CLI

```bash
pnpm install
pnpm db:start        # 로컬 Supabase 켜기 (Docker 필요) — 스키마·시드가 적용된다
pnpm env:local       # 로컬 주소·키·운영자 코드로 .env.local 만들기 (운영자 코드가 출력됨)
pnpm db:demo         # 데모 장소에 예시 마음 12개 채우기
pnpm dev             # http://localhost:3000
```

로컬 DB 주소(127.0.0.1)는 이 맥에서만 열린다. 휴대폰으로 보려면, 그리고 카메라를 쓰려면(HTTPS 필요) 클라우드 배포가 필요하다.

## 둘러보기 순서 (시연)

1. `/` 소개 → "근처의 기억 장소 찾기"(위치) 또는 "영일대 산책길에서 해 보기"
2. `/p/demo` QR 로 들어온 화면 → 마음 남기기 → 색·받는 사람·편지·보는 사람 → 이 자리에 두기
3. 남겨진 마음 보러 가기 → 둘러보기(끌어서 보기) / 모아보기 → 구슬을 누르면 편지
4. 다시 `/p/demo` → "내가 남긴 마음이 그대로 있어요" · `/me` 내 기억
5. `/admin` → 운영자 코드 입력 → 장소 만들기·QR·참여 수·숨김

컴퓨터에서는 카메라 대신 그림 위에서 끌어서 둘러본다. 휴대폰 카메라로 보려면 HTTPS 주소(배포)가 필요하다.

## 배포

- 주소: https://giok-walk.vercel.app · 데모 QR: `design/qr/demo-qr.png`
- 코드 배포: GitHub `main` 에 푸시하면 Vercel 이 자동 배포 (수동: `npx vercel deploy --prod`)
- DB 변경: `supabase db push` · 인증 설정: `supabase config push` (이 둘은 자동이 아니다)
- 운영자 코드·DB 비밀번호: 이 맥의 `.env.deploy.local` (git·배포에 올리지 않음)
- 자세한 값은 docs/decisions.md 8절

## 테스트

```bash
pnpm test            # 단위 테스트
pnpm test:db         # DB 규칙 테스트 (로컬 Supabase 필요)
pnpm test:e2e        # 핵심 흐름·화면 크기·밝기 테스트 (포트 3210 에 개발 서버를 띄운다. 이미 pnpm dev 가 떠 있으면 먼저 끈다)
pnpm typecheck && pnpm lint
```

## 디자인

- 색·서체·간격·반경: `src/styles/tokens.css` (여기만 바꾼다)
- 로고: `src/config/brand.ts`
- 색을 바꾼 뒤 `pnpm design:build` → 피그마용 에셋(`design/`), 앱 아이콘(`src/app/icon.svg`), 코드용 색(`src/styles/tokens.generated.ts`)이 함께 갱신된다. 빠뜨리면 `pnpm test` 가 알려 준다.

## 폴더

```
src/app            화면 (Next.js App Router)
src/components     공용 컴포넌트 (Logo, Orb …)
src/lib            감정 목록 등 규칙
src/styles         디자인 토큰
supabase/          DB 스키마(migrations)·시드·로컬 설정
tests/unit|db|e2e  테스트
design/            피그마용 SVG·토큰 (자동 생성)
docs/              결정 기록
```
