import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

if (!url || !publishableKey || !secretKey) {
  throw new Error("로컬 Supabase 환경 변수가 없어요. `supabase start` 후 `pnpm env:local` 을 실행하세요.");
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

/** RLS 를 우회하는 관리자 클라이언트 (테스트 준비용) */
export const admin = createClient(url, secretKey, noPersist);

/** QR 로 들어온 방문객처럼 익명 로그인한 클라이언트 */
export async function anonymousVisitor(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(url, publishableKey, noPersist);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("익명 로그인 실패");
  return { client, userId: data.user.id };
}

/** 로그인하지 않은 브라우저 */
export function guest(): SupabaseClient {
  return createClient(url, publishableKey, noPersist);
}

/** 운영자 계정 (익명 로그인 후 관리자 권한으로 역할만 바꾼다) */
export async function operator() {
  const visitor = await anonymousVisitor();
  const { error } = await admin.from("profiles").update({ role: "operator" }).eq("id", visitor.userId);
  if (error) throw error;
  return visitor;
}

/** 테스트마다 새 장소를 만든다 (다른 테스트의 하루 기록 제한과 섞이지 않도록) */
export async function createPlace(status: "open" | "closed" | "draft" = "open") {
  const slug = `t-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await admin
    .from("places")
    .insert({ slug, name: `테스트 장소 ${slug}`, status })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

export const sampleMemory = (placeId: string, overrides: Record<string, unknown> = {}) => ({
  place_id: placeId,
  emotion: "calm",
  recipient: "stranger",
  letter: "바다가 조용해서 오래 서 있었어.",
  visibility: "public",
  yaw: 120,
  pitch: 10,
  ...overrides,
});

/** 테스트가 만든 장소를 지운다 (데모 화면이 어지러워지지 않도록) */
export async function cleanupTestPlaces() {
  await admin.from("places").delete().or("slug.like.t-%,slug.like.op-%");
}
