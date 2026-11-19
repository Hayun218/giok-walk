-- 위치(GPS)로 현장 확인 (decisions 3-B)
-- 방문객 위치는 서버로 보내지 않는다. 휴대폰이 자기 위치와 장소 좌표(공개)를 비교해서
-- 반경 안이면 "마음 남기기"를 연다. 서버에는 장소 좌표·반경·설정만 있다.

alter table public.places
  add column radius_m integer not null default 100 check (radius_m between 20 and 2000), -- 남길 수 있는 반경
  add column presence_required boolean not null default true; -- 현장에서만 남기기

-- 데모 장소는 어디서나 시연할 수 있게 현장 확인을 끈다 (운영자 화면에서 다시 켤 수 있다)
update public.places set presence_required = false where slug = 'demo';
