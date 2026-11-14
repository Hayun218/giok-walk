-- 기억산책 MVP 초기 스키마
-- 원칙 (docs/decisions.md)
--  · 방문객 GPS 좌표는 저장하지 않는다. QR의 장소 ID가 "그 장소에서 남겼다"를 대신한다.
--  · 업무 규칙(공개 범위, 숨김, 신고, 참여 수)은 DB(RLS·함수)에 둔다 → 웹·네이티브가 같은 규칙을 쓴다.
--  · 오브젝트 위치는 북쪽 기준 방향(yaw)·높이(pitch)·거리로 저장한다.

-- ─────────────────────────────────────────────
-- 타입
-- ─────────────────────────────────────────────
create type public.place_mode as enum ('event', 'partner', 'personal');
create type public.place_status as enum ('draft', 'open', 'closed');
create type public.object_kind as enum ('orb', 'envelope');
create type public.memory_visibility as enum ('private', 'link', 'public');
create type public.memory_status as enum ('visible', 'hidden');
create type public.recipient_kind as enum ('future_me', 'companion', 'this_place', 'stranger');
create type public.activity_type as enum ('enter', 'create', 'view', 'share');

-- ─────────────────────────────────────────────
-- 프로필: auth.users 와 1:1. 익명 사용자도 프로필을 가진다.
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'visitor' check (role in ('visitor', 'operator')),
  display_name text check (char_length(display_name) <= 30),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 운영자 여부. RLS 안에서 쓰므로 security definer 로 profiles 정책을 우회한다.
create function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'operator'
  );
$$;

-- ─────────────────────────────────────────────
-- 장소 = QR 하나
-- ─────────────────────────────────────────────
create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(name) between 1 and 60),
  mode public.place_mode not null default 'event',
  description text check (char_length(description) <= 500),
  venue_name text check (char_length(venue_name) <= 60),
  -- 장소(행사장) 좌표. 운영자가 입력하는 값이며 방문객 위치가 아니다.
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  object_kind public.object_kind not null default 'orb', -- 장소가 정하는 오브젝트 (decisions 4-1)
  prompt text check (char_length(prompt) <= 80),          -- 장소별 질문 카드 (decisions 4-5)
  starts_at timestamptz,
  ends_at timestamptz,
  status public.place_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ─────────────────────────────────────────────
-- 기억(기록) = 오브젝트 하나 = 엽서 한 장
-- ─────────────────────────────────────────────
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emotion text not null check (emotion in ('joy', 'flutter', 'love', 'calm', 'thanks', 'longing')),
  recipient public.recipient_kind not null default 'stranger',
  letter text not null check (char_length(btrim(letter)) between 1 and 200),
  photo_path text, -- storage: memory-photos/{author_id}/{memory_id}.jpg
  visibility public.memory_visibility not null default 'public',
  -- 배치: 북쪽 기준 방향(도), 수평선 기준 높이(도), 거리(m)
  yaw real not null check (yaw >= 0 and yaw < 360),
  pitch real not null default 0 check (pitch between -30 and 60),
  distance real not null default 3 check (distance between 1 and 10),
  status public.memory_status not null default 'visible',
  report_count integer not null default 0,
  share_token uuid not null unique default gen_random_uuid(),
  recall_at timestamptz, -- 1년 뒤 회상 (이번엔 구조만)
  created_at timestamptz not null default now(),
  -- 사진은 나만 보기·링크 기록에만 (decisions 4-3, B안)
  constraint public_memory_has_no_photo check (not (visibility = 'public' and photo_path is not null))
);

create index memories_place_idx on public.memories (place_id, created_at desc);
create index memories_author_idx on public.memories (author_id, created_at desc);

-- 금칙어 (승인 없는 공개의 안전장치, decisions 4-6)
create table public.blocked_words (
  word text primary key check (char_length(word) between 1 and 30)
);

-- 저장 전 검사: 금칙어, 장소 운영 상태, 1인당 장소별 하루 기록 수
create function public.check_memory_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_count integer;
  place_state public.place_status;
begin
  select status into place_state from public.places where id = new.place_id;
  if place_state is distinct from 'open' then
    raise exception 'place_not_open' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.blocked_words b
    where position(lower(b.word) in lower(new.letter)) > 0
  ) then
    raise exception 'blocked_word' using errcode = 'P0001';
  end if;

  select count(*) into today_count
  from public.memories m
  where m.author_id = new.author_id
    and m.place_id = new.place_id
    and m.created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  if today_count >= 5 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  -- 서버가 정하는 값은 클라이언트가 바꿀 수 없다
  new.status := 'visible';
  new.report_count := 0;
  return new;
end;
$$;

create trigger memories_before_insert
  before insert on public.memories
  for each row execute function public.check_memory_before_insert();

-- 글을 고칠 때도 금칙어 검사
create function public.check_memory_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.letter is distinct from old.letter and exists (
    select 1 from public.blocked_words b
    where position(lower(b.word) in lower(new.letter)) > 0
  ) then
    raise exception 'blocked_word' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger memories_before_update
  before update on public.memories
  for each row execute function public.check_memory_before_update();

-- ─────────────────────────────────────────────
-- 신고: 3번 쌓이면 자동 숨김 → 운영자 확인
-- ─────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('abuse', 'spam', 'privacy', 'other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (memory_id, reporter_id)
);

create function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memories
  set report_count = report_count + 1,
      status = case when report_count + 1 >= 3 then 'hidden'::public.memory_status else status end
  where id = new.memory_id;
  return new;
end;
$$;

create trigger on_report_created
  after insert on public.reports
  for each row execute function public.handle_new_report();

-- ─────────────────────────────────────────────
-- 참여 기록 (운영자 참여 수)
-- ─────────────────────────────────────────────
create table public.activity (
  id bigint generated always as identity primary key,
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type public.activity_type not null,
  created_at timestamptz not null default now()
);

create index activity_place_idx on public.activity (place_id, type, created_at);

-- ─────────────────────────────────────────────
-- 회상 알림 (이번엔 구조만, 발송 없음)
-- ─────────────────────────────────────────────
create table public.recall_subscriptions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  channel text not null check (channel in ('email', 'kakao', 'sms')),
  address text not null,
  consent_at timestamptz not null default now(),
  send_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.memories enable row level security;
alter table public.blocked_words enable row level security;
alter table public.reports enable row level security;
alter table public.activity enable row level security;
alter table public.recall_subscriptions enable row level security;

-- profiles: 본인 것만 읽기. 역할 변경은 SQL 콘솔에서만.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_operator()));

-- places: 운영 중·종료된 장소는 누구나 읽기, 쓰기는 운영자만
create policy "places: read published" on public.places
  for select to anon, authenticated using (status in ('open', 'closed') or (select public.is_operator()));
create policy "places: operator insert" on public.places
  for insert to authenticated with check ((select public.is_operator()));
create policy "places: operator update" on public.places
  for update to authenticated using ((select public.is_operator())) with check ((select public.is_operator()));
create policy "places: operator delete" on public.places
  for delete to authenticated using ((select public.is_operator()));

-- memories 읽기: 내 것(숨김 포함) / 전체 공개이면서 보이는 것 / 운영자
-- 링크 공개는 목록에 나오지 않고 get_shared_memory(token) 으로만 연다.
create policy "memories: read own" on public.memories
  for select to authenticated using (author_id = (select auth.uid()));
create policy "memories: read public" on public.memories
  for select to anon, authenticated using (visibility = 'public' and status = 'visible');
create policy "memories: operator read" on public.memories
  for select to authenticated using ((select public.is_operator()));

-- memories 쓰기: 본인 이름으로만, 운영 중인 장소에만(트리거에서 검사)
create policy "memories: insert own" on public.memories
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "memories: update own" on public.memories
  for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "memories: delete own" on public.memories
  for delete to authenticated using (author_id = (select auth.uid()));

-- 작성자가 바꿀 수 있는 칸만 열어 둔다 (status, report_count, place_id 등은 잠금)
revoke update on public.memories from anon, authenticated;
grant update (emotion, recipient, letter, photo_path, visibility) on public.memories to authenticated;

-- blocked_words: 운영자만
create policy "blocked_words: operator all" on public.blocked_words
  for all to authenticated using ((select public.is_operator())) with check ((select public.is_operator()));

-- reports: 본인 이름으로 신고, 읽기는 운영자
create policy "reports: insert own" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reports: operator read" on public.reports
  for select to authenticated using ((select public.is_operator()));
create policy "reports: operator update" on public.reports
  for update to authenticated using ((select public.is_operator()));

-- activity: 본인 이름으로 기록, 읽기는 운영자
create policy "activity: insert own" on public.activity
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "activity: operator read" on public.activity
  for select to authenticated using ((select public.is_operator()));

-- recall_subscriptions: 내 기억에 대해서만
create policy "recall: own memory" on public.recall_subscriptions
  for all to authenticated
  using (exists (select 1 from public.memories m where m.id = memory_id and m.author_id = (select auth.uid())))
  with check (exists (select 1 from public.memories m where m.id = memory_id and m.author_id = (select auth.uid())));

-- ─────────────────────────────────────────────
-- 함수 (RPC)
-- ─────────────────────────────────────────────

-- 공유 링크로 기억 하나 열기 (링크·전체 공개, 숨김 아닌 것만)
create function public.get_shared_memory(token uuid)
returns table (
  id uuid,
  place_id uuid,
  place_name text,
  place_slug text,
  emotion text,
  recipient public.recipient_kind,
  letter text,
  photo_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.place_id, p.name, p.slug, m.emotion, m.recipient, m.letter, m.photo_path, m.created_at
  from public.memories m
  join public.places p on p.id = m.place_id
  where m.share_token = token
    and m.visibility in ('link', 'public')
    and m.status = 'visible';
$$;

-- 운영자: 기억 숨김/복원
create function public.set_memory_status(memory uuid, new_status public.memory_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_operator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.memories set status = new_status where id = memory;
  update public.reports set resolved_at = now() where memory_id = memory and resolved_at is null;
end;
$$;

-- 운영자: 장소 참여 수
create function public.place_stats(place uuid)
returns table (visitors bigint, entries bigint, memories bigint, hidden bigint, open_reports bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_operator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select
    (select count(distinct a.user_id) from public.activity a where a.place_id = place),
    (select count(*) from public.activity a where a.place_id = place and a.type = 'enter'),
    (select count(*) from public.memories m where m.place_id = place),
    (select count(*) from public.memories m where m.place_id = place and m.status = 'hidden'),
    (select count(*) from public.reports r join public.memories m on m.id = r.memory_id
      where m.place_id = place and r.resolved_at is null);
end;
$$;

revoke execute on function public.get_shared_memory(uuid) from public;
grant execute on function public.get_shared_memory(uuid) to anon, authenticated;
revoke execute on function public.set_memory_status(uuid, public.memory_status) from public, anon;
grant execute on function public.set_memory_status(uuid, public.memory_status) to authenticated;
revoke execute on function public.place_stats(uuid) from public, anon;
grant execute on function public.place_stats(uuid) to authenticated;

-- ─────────────────────────────────────────────
-- 사진 저장소: 비공개 버킷. 경로 첫 폴더 = 작성자 ID
-- 링크로 여는 사람에게는 서버가 짧은 서명 URL을 만들어 준다.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-photos', 'memory-photos', false, 5242880, array['image/jpeg', 'image/webp']);

create policy "photos: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
