-- 로컬 개발용 시드. `supabase db reset` 때 실행된다.

insert into public.places (slug, name, mode, description, venue_name, lat, lng, object_kind, prompt, status)
values
  ('demo', '영일대 산책길', 'event',
   '바다 앞에서 오늘의 마음을 남겨 보세요.', '포항 영일대 해수욕장',
   36.0563, 129.3784, 'orb', '오늘 가장 오래 바라본 풍경은 무엇이었나요?', 'open'),
  ('closed-demo', '지난 겨울 축제', 'event',
   '이미 끝난 행사예요. 남겨진 마음만 볼 수 있어요.', '포항 구룡포',
   35.9905, 129.5560, 'orb', null, 'closed');

-- 데모 장소는 어디서나 시연 (현장 확인 끔)
update public.places set presence_required = false where slug = 'demo';

-- 금칙어 예시. 실제 목록은 운영 전에 채운다.
insert into public.blocked_words (word) values ('광고문의'), ('카톡아이디');

-- e2e 테스트 전용 장소 (데모 장소가 테스트 기록으로 어지러워지지 않도록)
insert into public.places (slug, name, mode, description, venue_name, object_kind, prompt, status)
values ('e2e', '테스트 산책길', 'event', '자동 테스트용 장소예요.', '테스트', 'orb', '오늘 무엇을 보았나요?', 'open');
-- 테스트 장소 좌표 (서울시청). e2e 는 브라우저 위치를 여기 근처로 가정한다
update public.places set lat = 37.5665, lng = 126.9780, radius_m = 100 where slug = 'e2e';
