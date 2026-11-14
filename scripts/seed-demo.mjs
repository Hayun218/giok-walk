#!/usr/bin/env node
/**
 * 데모 장소(/p/demo)에 다른 방문객들이 남긴 것 같은 마음을 채운다. (로컬·시연용)
 * 실행: pnpm db:demo   (supabase db reset 뒤에 다시 돌리면 된다)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error(".env.local 이 없어요. pnpm env:local 먼저.");
const admin = createClient(url, secret, { auth: { persistSession: false } });

const LETTERS = [
  ["calm", "stranger", "바다가 조용해서 오래 서 있었어. 내년에 또 오자."],
  ["joy", "this_place", "처음 와 본 영일대, 생각보다 바람이 따뜻했어요."],
  ["longing", "stranger", "할머니랑 같이 걸었던 길. 다음엔 꼭 같이 오고 싶다."],
  ["flutter", "future_me", "오늘 여기서 고백했다. 대답은… 다시 와서 확인하기."],
  ["thanks", "stranger", "힘든 한 주였는데 파도 보니까 괜찮아졌어요. 고마워요."],
  ["love", "stranger", "누군가 이 편지를 읽는다면, 오늘 하루도 수고했어요."],
  ["joy", "companion", "아이가 처음으로 모래성을 끝까지 쌓은 날."],
  ["longing", "this_place", "10년 전 사진이랑 똑같은 자리에 서 봤어. 그대로라서 좋다."],
  ["calm", "stranger", "야경이 이렇게 예쁜 줄 몰랐네. 천천히 걷다 갑니다."],
  ["thanks", "this_place", "덕분에 오늘 많이 웃었어요."],
  ["flutter", "stranger", "다음 축제 때 또 만나요. 그때는 둘이 아니라 셋일지도."],
  ["love", "companion", "엄마, 여기 노을 진짜 예쁘지? 내년에도 같이 오자."],
];

const { data: place } = await admin.from("places").select("id").eq("slug", "demo").single();
if (!place) throw new Error("데모 장소가 없어요. supabase db reset 을 먼저 해 주세요.");

await admin.from("memories").delete().eq("place_id", place.id);

// 예시 방문객은 익명 계정으로 만든다 (가짜 이메일 계정을 만들지 않는다)
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const visitors = [];
for (let i = 0; i < 4; i++) {
  const visitor = createClient(url, publishable, { auth: { persistSession: false } });
  const { data, error } = await visitor.auth.signInAnonymously();
  if (error) throw error;
  visitors.push(data.user.id);
}

const now = Date.now();
const rows = LETTERS.map(([emotion, recipient, letter], i) => ({
  place_id: place.id,
  author_id: visitors[i % visitors.length],
  emotion,
  recipient,
  letter,
  visibility: "public",
  yaw: Math.round(((i * 360) / LETTERS.length + (Math.random() * 16 - 8) + 360) % 360),
  pitch: Math.round(-8 + Math.random() * 30),
  distance: Math.round((2.6 + Math.random() * 2) * 10) / 10,
}));
const { data: inserted, error } = await admin.from("memories").insert(rows).select("id");
if (error) throw error;

// 며칠에 걸쳐 남긴 것처럼 날짜를 흩어 둔다
for (const [i, m] of inserted.entries()) {
  const created = new Date(now - (i * 7 + Math.random() * 5) * 3600 * 1000).toISOString();
  await admin.from("memories").update({ created_at: created }).eq("id", m.id);
}
console.log(`데모 장소에 마음 ${inserted.length}개를 남겼어요.`);
