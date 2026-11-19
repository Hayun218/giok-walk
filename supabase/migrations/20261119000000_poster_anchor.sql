-- 포스터(QR) 기준 고정 (decisions 3-A)
-- 장소의 QR 포스터를 기준점으로, 기억마다 포스터 주변의 자리를 하나씩 나눠 준다.
-- 자리는 해바라기 씨앗 배열(황금각 나선)이라 몇 명이 남겨도 겹치지 않는다.
-- QR 둘레 약 20cm 는 비워 둔다 (포스터가 가려지지 않게).
-- 좌표계(미터): 원점 = QR 한가운데, x = 오른쪽, y = 위, z = 포스터 앞(보는 사람 쪽)

alter table public.places
  add column anchor_size_m real not null default 0.2 check (anchor_size_m between 0.05 and 2), -- 인쇄된 QR 한 변 길이
  add column anchor_seq integer not null default 0; -- 지금까지 나눠 준 자리 수

alter table public.memories
  add column anchor_slot integer,
  add column anchor_x real,
  add column anchor_y real,
  add column anchor_z real;

-- n 번째 자리 (0부터). src/lib/anchor.ts 의 anchorSlot 과 같은 식이어야 한다 (DB 테스트가 확인)
create function public.anchor_slot_position(n integer, out x real, out y real, out z real)
language sql
immutable
as $$
  select
    (0.15 * sqrt(n + 3) * cos(n * 2.39996323))::real,
    (0.15 * sqrt(n + 3) * sin(n * 2.39996323) * 0.8)::real,
    (0.05 + ((n * 0.6180339887) - floor(n * 0.6180339887)) * 0.3)::real;
$$;

-- 새 기억에 자리 배정. 장소 행을 잠그고 번호를 올리므로 동시에 남겨도 같은 자리를 받지 않는다.
-- 클라이언트가 보낸 anchor 값은 무시한다.
create function public.assign_anchor_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot integer;
  pos record;
begin
  update public.places set anchor_seq = anchor_seq + 1
  where id = new.place_id
  returning anchor_seq - 1 into slot;

  select * into pos from public.anchor_slot_position(slot);
  new.anchor_slot := slot;
  new.anchor_x := pos.x;
  new.anchor_y := pos.y;
  new.anchor_z := pos.z;
  return new;
end;
$$;

-- 이름 순서상 memories_before_insert(검사) 다음에 실행된다
create trigger memories_before_insert_zz_anchor
  before insert on public.memories
  for each row execute function public.assign_anchor_slot();

-- 이미 있는 기억에도 남긴 순서대로 자리를 준다
with ordered as (
  select id, place_id, (row_number() over (partition by place_id order by created_at, id) - 1)::integer as n
  from public.memories
)
update public.memories m
set anchor_slot = o.n,
    anchor_x = p.x,
    anchor_y = p.y,
    anchor_z = p.z
from ordered o, lateral public.anchor_slot_position(o.n) p
where m.id = o.id;

update public.places pl
set anchor_seq = coalesce((select max(anchor_slot) + 1 from public.memories m where m.place_id = pl.id), 0);

-- 작성자도 자리는 바꿀 수 없다 (update 권한 목록에 anchor_* 를 넣지 않는다 — 기존 grant 그대로)
-- 장소 관리 화면에서 운영자가 QR 크기를 바꿀 수 있도록 places 는 기존 운영자 정책을 따른다
